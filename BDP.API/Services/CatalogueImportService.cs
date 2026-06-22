using BDP.API.Data;
using BDP.API.Models;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text.RegularExpressions;

namespace BDP.API.Services;

public class ImportResult
{
    public int Added { get; set; }
    public int Updated { get; set; }
    public int Unchanged { get; set; }
    public int ImagesSet { get; set; }
    public int ImagesCleared { get; set; }
    public int ProductsDeleted { get; set; }
    public int VariantsDeleted { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class CatalogueImportService
{
    private readonly AppDbContext _db;

    public CatalogueImportService(AppDbContext db) => _db = db;

    public async Task<ImportResult> ImportFromStreamAsync(Stream csvStream)
    {
        var result = new ImportResult();

        // ── Parse CSV ──────────────────────────────────────────────────────────
        List<CatalogueRow> rows;
        try
        {
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HeaderValidated = null,
                MissingFieldFound = null,
                TrimOptions = TrimOptions.Trim,
            };
            using var reader = new StreamReader(csvStream);
            using var csv = new CsvReader(reader, config);
            rows = csv.GetRecords<CatalogueRow>().ToList();
        }
        catch (Exception ex)
        {
            result.Errors.Add($"CSV parse failed: {ex.Message}");
            return result;
        }

        if (rows.Count == 0)
        {
            result.Errors.Add("CSV file is empty or has no data rows.");
            return result;
        }

        // ── Load settings for pricing ─────────────────────────────────────────
        var settings = await _db.ShippingSettings.FindAsync(1);
        decimal bufferCNY = settings?.BufferCNY ?? 3.00m;
        decimal cnyToZar  = settings?.CnyToZarRate ?? 2.40m;

        // ── Collect all SKUs/supplier item numbers present in the sheet ────────
        // Used at the end to delete stale rows from the DB.
        var sheetSupplierItemNumbers = rows
            .Where(r => !string.IsNullOrWhiteSpace(r.Supplier_Item_Number))
            .Select(r => r.Supplier_Item_Number!.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var sheetSkuIds = rows
            .Where(r => !string.IsNullOrWhiteSpace(r.SKU_ID))
            .Select(r => r.SKU_ID!.Trim())
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // ── Group rows by SupplierItemNumber ──────────────────────────────────
        var groups = rows
            .Where(r => !string.IsNullOrWhiteSpace(r.Supplier_Item_Number))
            .GroupBy(r => r.Supplier_Item_Number!.Trim());

        foreach (var group in groups)
        {
            try
            {
                var supplierItemNumber = group.Key;
                var firstRow = group.First();

                // ── Find or create Supplier ────────────────────────────────────
                var supplierName = firstRow.Supplier?.Trim() ?? "";
                Supplier? supplier = null;
                if (!string.IsNullOrWhiteSpace(supplierName))
                {
                    var keyWords = supplierName.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                        .Take(2)
                        .ToArray();
                    var keyword = string.Join(" ", keyWords);

                    var allSuppliers = await _db.Suppliers.ToListAsync();
                    supplier = allSuppliers.FirstOrDefault(s =>
                        supplierName.Contains(s.Name, StringComparison.OrdinalIgnoreCase) ||
                        s.Name.Contains(keyword, StringComparison.OrdinalIgnoreCase));

                    if (supplier == null)
                    {
                        supplier = new Supplier
                        {
                            Name = supplierName,
                            Country = "China",
                            SuppliesBottles = true,
                            SuppliesCustomisation = false,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                        };
                        _db.Suppliers.Add(supplier);
                        await _db.SaveChangesAsync();
                    }
                }

                // ── Find or create Product ─────────────────────────────────────
                var product = await _db.Products
                    .Include(p => p.Variants).ThenInclude(v => v.PricingTiers)
                    .Include(p => p.Images)
                    .FirstOrDefaultAsync(p => p.SupplierItemNumber == supplierItemNumber);

                bool isNew = product == null;
                if (product == null)
                {
                    product = new Product { CreatedAt = DateTime.UtcNow };
                    _db.Products.Add(product);
                }

                // ── Assign a unique human name if needed ───────────────────────
                bool needsName = string.IsNullOrWhiteSpace(product.Name)
                    || product.Name.Contains(' ');
                if (needsName)
                    product.Name = await ProductNameService.AssignUniqueNameAsync(_db);

                product.Category = firstRow.Product_Type?.Trim() ?? product.Category;
                product.SupplierItemNumber = supplierItemNumber;
                product.ProductType = firstRow.Product_Type?.Trim();
                product.ShapeStyle = firstRow.Shape_Style?.Trim();
                product.Slug = Slugify($"{product.Name} {supplierItemNumber}");
                product.UpdatedAt = DateTime.UtcNow;

                if (supplier != null)
                    product.SupplierId = supplier.Id;

                product.MetaTitle = ProductSeoGenerator.GenerateSeoTitle(firstRow);
                product.Description = ProductSeoGenerator.GenerateDescription(firstRow, group);
                product.MetaDescription = ProductSeoGenerator.GenerateMetaDescription(firstRow);
                product.MetaKeywords = ProductSeoGenerator.GenerateMetaKeywords(firstRow);

                await _db.SaveChangesAsync();

                // ── Auto-assign to collection based on product type ───────────
                if (!string.IsNullOrWhiteSpace(product.ProductType))
                    await EnsureProductInCollectionAsync(_db, product, product.ProductType);

                // ── Upsert each variant ────────────────────────────────────────
                foreach (var row in group)
                {
                    if (string.IsNullOrWhiteSpace(row.SKU_ID)) continue;

                    var skuId = row.SKU_ID.Trim();
                    var variant = product.Variants.FirstOrDefault(v =>
                        string.Equals(v.SkuId, skuId, StringComparison.OrdinalIgnoreCase));
                    bool variantIsNew = variant == null;

                    if (variant == null)
                    {
                        variant = new ProductVariant { ProductId = product.Id };
                        _db.ProductVariants.Add(variant);
                    }

                    variant.SkuId = skuId;
                    variant.SKU = skuId;
                    variant.SpecificationSize = row.Specification_Size?.Trim();
                    variant.ColorVariantName = row.Color_Variant_Name?.Trim();
                    variant.BaseBodyColor = row.Base_Body_Color?.Trim();
                    variant.BaseBodyFinish = row.Base_Body_Finish?.Trim();
                    variant.LidCapColor = row.Lid_Cap_Color?.Trim();
                    variant.LidCapFinish = row.Lid_Cap_Finish?.Trim();
                    variant.LidCapMaterial = row.Lid_Cap_Material?.Trim();
                    variant.ClosureType = row.Closure_Type?.Trim();
                    variant.BodyMaterial = row.Body_Material?.Trim();
                    variant.AccessoriesIncluded = row.Accessories_Included?.Trim();
                    variant.ImageFilename = row.Image_Filename?.Trim();
                    variant.ImageDriveLink = row.Image_Drive_Link?.Trim();
                    variant.Source1688Url = row.Source_URL?.Trim();
                    variant.IsActive = true;

                    // Legacy field mappings
                    variant.Size = row.Specification_Size?.Trim();
                    variant.BottleColour = row.Base_Body_Color?.Trim();
                    variant.LidColour = row.Lid_Cap_Color?.Trim();
                    variant.Texture = row.Base_Body_Finish?.Trim();

                    decimal.TryParse(row.Unit_Price_CNY, NumberStyles.Any, CultureInfo.InvariantCulture, out var unitPrice);
                    variant.UnitPriceCNY = unitPrice;

                    int.TryParse(row.MOQ, out var moq);
                    variant.SupplierMoq = moq > 0 ? moq : 1;

                    await _db.SaveChangesAsync();

                    // ── Regenerate pricing tiers ────────────────────────────────
                    var existingTiers = await _db.ProductPricingTiers
                        .Where(t => t.ProductVariantId == variant.Id)
                        .ToListAsync();
                    _db.ProductPricingTiers.RemoveRange(existingTiers);
                    await _db.SaveChangesAsync();

                    // Sale price = landed cost + a percentage markup. Using a percentage
                    // (rather than the old flat ProfitCNY) keeps the starting margin healthy
                    // and — because the markup exceeds the maximum 25% volume discount —
                    // guarantees no tier is ever sold below cost.
                    // 0.70 → ~41% gross margin at qty 10 (R1.88 jar starts ≈ R19.91/unit),
                    // tapering to ~22% at the 5000 tier.
                    const decimal markupRate = 0.70m;
                    var landedCostPerUnit = (unitPrice + bufferCNY) * cnyToZar;
                    var basePricePerUnit = landedCostPerUnit * (1 + markupRate);
                    var quantities = new[] { 10, 50, 100, 250, 500, 1000, 2500, 5000 };
                    // Volume discount: % off the base unit price at each quantity anchor.
                    // Larger orders get a lower per-unit price.
                    var discounts   = new[] { 0m, 0.03m, 0.06m, 0.10m, 0.14m, 0.18m, 0.22m, 0.25m };

                    for (var i = 0; i < quantities.Length; i++)
                    {
                        var qty = quantities[i];
                        var pricePerUnit = basePricePerUnit * (1 - discounts[i]);
                        _db.ProductPricingTiers.Add(new ProductPricingTier
                        {
                            ProductVariantId = variant.Id,
                            Quantity = qty,
                            CostCNY = unitPrice * qty,
                            CostWithShippingCNY = (unitPrice + bufferCNY) * qty,
                            CostWithDutiesCNY = (unitPrice + bufferCNY) * qty,
                            CostPerUnitZAR = Math.Round(pricePerUnit, 4),
                            SalePriceZAR = Math.Round(pricePerUnit * qty, 4),
                            SKU = $"{skuId}-{qty}",
                        });
                    }
                    await _db.SaveChangesAsync();

                    if (variantIsNew) result.Added++;
                    else result.Updated++;
                }

                // ── Handle images — always replace with sheet value ────────────
                // Pick the first non-empty Images URL from any row in this group.
                var imageUrl = group
                    .Select(r => r.Images?.Trim())
                    .FirstOrDefault(u => !string.IsNullOrWhiteSpace(u));

                // Clear all existing images for this product regardless.
                if (product.Images.Count > 0)
                    _db.ProductImages.RemoveRange(product.Images);

                if (!string.IsNullOrWhiteSpace(imageUrl))
                {
                    var embeddable = ToEmbeddableUrl(imageUrl);
                    if (embeddable != null)
                    {
                        _db.ProductImages.Add(new ProductImage
                        {
                            ProductId = product.Id,
                            Url = embeddable,
                            AltText = product.MetaTitle ?? product.Name,
                            SortOrder = 0,
                            IsPrimary = true,
                        });
                        result.ImagesSet++;
                    }
                    else
                    {
                        result.Errors.Add($"Could not parse Drive URL for '{supplierItemNumber}': {imageUrl}");
                        result.ImagesCleared++;
                    }
                }
                else
                {
                    result.ImagesCleared++;
                }

                await _db.SaveChangesAsync();

                if (isNew && result.Added == 0 && result.Updated == 0)
                    result.Unchanged++;
            }
            catch (Exception ex)
            {
                result.Errors.Add($"Group '{group.Key}': {ex.Message}");
            }
        }

        // ── Delete stale variants not in the sheet ────────────────────────────
        // Only remove variants that have a SkuId set (skip manually created ones).
        try
        {
            var staleVariants = await _db.ProductVariants
                .Where(v => v.SkuId != null && !sheetSkuIds.Contains(v.SkuId))
                .ToListAsync();

            if (staleVariants.Any())
            {
                var staleIds = staleVariants.Select(v => v.Id).ToList();

                // Remove cart items that reference these variants
                await _db.Database.ExecuteSqlRawAsync(
                    $"DELETE FROM \"CartItems\" WHERE \"ProductVariantId\" = ANY(@p0)",
                    new Npgsql.NpgsqlParameter("p0", staleIds.ToArray()));

                // Null out order item variant references to preserve order history
                await _db.Database.ExecuteSqlRawAsync(
                    $"UPDATE \"OrderItems\" SET \"ProductVariantId\" = NULL WHERE \"ProductVariantId\" = ANY(@p0)",
                    new Npgsql.NpgsqlParameter("p0", staleIds.ToArray()));

                _db.ProductVariants.RemoveRange(staleVariants);
                await _db.SaveChangesAsync();
                result.VariantsDeleted += staleVariants.Count;
            }
        }
        catch (Exception ex)
        {
            result.Errors.Add($"Stale variant cleanup: {ex.Message}");
        }

        // ── Delete stale products not in the sheet ────────────────────────────
        // Only remove products that have a SupplierItemNumber set.
        try
        {
            var staleProducts = await _db.Products
                .Where(p => p.SupplierItemNumber != null && !sheetSupplierItemNumbers.Contains(p.SupplierItemNumber))
                .ToListAsync();

            if (staleProducts.Any())
            {
                var staleProductIds = staleProducts.Select(p => p.Id).ToList();

                // Remove collection memberships
                await _db.Database.ExecuteSqlRawAsync(
                    $"DELETE FROM \"ProductCollections\" WHERE \"ProductId\" = ANY(@p0)",
                    new Npgsql.NpgsqlParameter("p0", staleProductIds.ToArray()));

                _db.Products.RemoveRange(staleProducts);
                await _db.SaveChangesAsync();
                result.ProductsDeleted += staleProducts.Count;
            }
        }
        catch (Exception ex)
        {
            result.Errors.Add($"Stale product cleanup: {ex.Message}");
        }

        return result;
    }

    // Convert a Google Drive share URL to a directly embeddable image URL.
    private static string? ToEmbeddableUrl(string driveUrl)
    {
        var match = Regex.Match(driveUrl, @"/file/d/([a-zA-Z0-9_-]+)");
        if (!match.Success) return null;
        var fileId = match.Groups[1].Value;
        return $"https://lh3.googleusercontent.com/d/{fileId}";
    }

    public static async Task EnsureProductInCollectionAsync(AppDbContext context, Product product, string productType)
    {
        var collectionName = MapProductTypeToCollection(productType);
        var slug = Slugify(collectionName);

        var collection = await context.Collections.FirstOrDefaultAsync(c => c.Slug == slug);
        if (collection == null)
        {
            collection = new Collection
            {
                Name = collectionName,
                Slug = slug,
                Description = GenerateCollectionDescription(collectionName),
                ImageUrl = null,
            };
            context.Collections.Add(collection);
            await context.SaveChangesAsync();
        }

        var alreadyIn = await context.ProductCollections
            .AnyAsync(pc => pc.CollectionId == collection.Id && pc.ProductId == product.Id);
        if (!alreadyIn)
        {
            context.ProductCollections.Add(new ProductCollection
            {
                CollectionId = collection.Id,
                ProductId = product.Id,
            });
            await context.SaveChangesAsync();
        }
    }

    private static string MapProductTypeToCollection(string productType)
    {
        var lower = productType.ToLowerInvariant();
        if (lower.Contains("dropper") || lower.Contains("essential oil")) return "Dropper Bottles";
        if (lower.Contains("cream jar") || lower.Contains("jar")) return "Cream Jars";
        if (lower.Contains("pump")) return "Pump Bottles";
        if (lower.Contains("serum")) return "Serum Bottles";
        if (lower.Contains("spray") || lower.Contains("mist")) return "Spray Bottles";
        if (lower.Contains("lotion")) return "Lotion Bottles";
        if (lower.Contains("shampoo") || lower.Contains("conditioner")) return "Shampoo & Conditioner Bottles";
        if (lower.Contains("airless")) return "Airless Bottles";
        if (lower.Contains("tube")) return "Tubes";
        return productType.TrimEnd('s') + "s";
    }

    private static string GenerateCollectionDescription(string collectionName) => collectionName switch
    {
        "Dropper Bottles" => "Premium glass dropper bottles for essential oils, serums, and facial oils. Available in multiple sizes and finishes for aromatherapy brands, skincare manufacturers, and hotel amenity collections.",
        "Cream Jars" => "Wholesale glass cream jars for face creams, body butters, and cosmetic formulations. Ideal for skincare brands, spa collections, and private label manufacturing.",
        "Pump Bottles" => "Cosmetic pump bottles for lotions, serums, shampoos, and liquid dispensing. Suitable for haircare brands, skincare manufacturers, and hotel amenity suppliers.",
        "Serum Bottles" => "Glass serum bottles designed for facial oils, vitamin C serums, and high-value cosmetic formulations. Frosted, clear, and coloured finishes available.",
        "Spray Bottles" => "Fine mist spray bottles for toners, facial mists, room sprays, and perfume packaging. Suitable for skincare, fragrance, and hospitality brands.",
        "Lotion Bottles" => "Wholesale lotion and body cream bottles. Ideal for skincare brands, body care manufacturers, and hotel amenity packaging.",
        "Shampoo & Conditioner Bottles" => "Wholesale shampoo and conditioner bottles for haircare brands, professional salons, and hotel amenity collections.",
        "Airless Bottles" => "Airless pump bottles that protect sensitive formulations from oxidation. Premium packaging for luxury skincare and anti-ageing products.",
        "Tubes" => "Cosmetic squeeze tubes for creams, gels, sunscreens, and serums. Suitable for skincare, haircare, and professional cosmetic manufacturers.",
        _ => $"Wholesale {collectionName.ToLowerInvariant()} for cosmetic brands, skincare manufacturers, and private label suppliers."
    };

    private static string Slugify(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var slug = input.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        return slug.Trim('-');
    }
}

// ── CatalogueRow — maps directly to CSV columns ───────────────────────────────
public class CatalogueRow
{
    public string? SKU_ID { get; set; }
    public string? Product_Name { get; set; }
    public string? Supplier { get; set; }
    public string? Supplier_Item_Number { get; set; }
    public string? Product_Type { get; set; }
    public string? Shape_Style { get; set; }
    public string? Specification_Size { get; set; }
    public string? Color_Variant_Name { get; set; }
    public string? Base_Body_Color { get; set; }
    public string? Base_Body_Finish { get; set; }
    public string? Lid_Cap_Color { get; set; }
    public string? Lid_Cap_Finish { get; set; }
    public string? Lid_Cap_Material { get; set; }
    public string? Closure_Type { get; set; }
    public string? Body_Material { get; set; }
    public string? Accessories_Included { get; set; }
    public string? Unit_Price_CNY { get; set; }
    public string? MOQ { get; set; }
    public string? Images { get; set; }
    public string? Image_Filename { get; set; }
    public string? Image_Drive_Link { get; set; }
    public string? Source_URL { get; set; }
    public string? Date_Added { get; set; }
}
