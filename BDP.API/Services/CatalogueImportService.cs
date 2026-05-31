using BDP.API.Data;
using BDP.API.Models;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace BDP.API.Services;

public class ImportResult
{
    public int Added { get; set; }
    public int Updated { get; set; }
    public int Unchanged { get; set; }
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
        decimal profitCNY = settings?.ProfitCNY ?? 1.00m;
        decimal cnyToZar  = settings?.CnyToZarRate ?? 2.40m;

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
                    // Extract the first two meaningful words (e.g. "Hongxin Pharmaceutical")
                    // to match against existing suppliers regardless of how long the CSV name is.
                    var keyWords = supplierName.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                        .Take(2)
                        .ToArray();
                    var keyword = string.Join(" ", keyWords);

                    // Try: CSV name contains DB name, OR DB name contains keyword from CSV
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
                    .FirstOrDefaultAsync(p => p.SupplierItemNumber == supplierItemNumber);

                bool isNew = product == null;
                if (product == null)
                {
                    product = new Product
                    {
                        CreatedAt = DateTime.UtcNow,
                    };
                    _db.Products.Add(product);
                }

                product.Name = firstRow.Product_Name?.Trim() ?? product.Name;
                product.Category = firstRow.Product_Type?.Trim() ?? product.Category;
                product.SupplierItemNumber = supplierItemNumber;
                product.ProductType = firstRow.Product_Type?.Trim();
                product.ShapeStyle = firstRow.Shape_Style?.Trim();
                product.Slug = Slugify($"{firstRow.Product_Name} {supplierItemNumber}");
                product.UpdatedAt = DateTime.UtcNow;

                if (supplier != null)
                    product.SupplierId = supplier.Id;

                // Ensure non-nullable string fields have defaults
                if (string.IsNullOrWhiteSpace(product.MetaTitle))
                    product.MetaTitle = product.Name;
                if (string.IsNullOrWhiteSpace(product.MetaDescription))
                    product.MetaDescription = product.Name;
                if (string.IsNullOrWhiteSpace(product.MetaKeywords))
                    product.MetaKeywords = string.Empty;

                await _db.SaveChangesAsync();

                // ── Upsert each variant ────────────────────────────────────────
                foreach (var row in group)
                {
                    if (string.IsNullOrWhiteSpace(row.SKU_ID)) continue;

                    var skuId = row.SKU_ID.Trim();
                    var variant = product.Variants.FirstOrDefault(v => v.SkuId == skuId);
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

                    var salePricePerUnit = (unitPrice + bufferCNY + profitCNY) * cnyToZar;
                    var quantities = new[] { 10, 50, 100, 250, 500, 1000, 2500, 5000 };

                    foreach (var qty in quantities)
                    {
                        _db.ProductPricingTiers.Add(new ProductPricingTier
                        {
                            ProductVariantId = variant.Id,
                            Quantity = qty,
                            CostCNY = unitPrice * qty,
                            CostWithShippingCNY = (unitPrice + bufferCNY) * qty,
                            CostWithDutiesCNY = (unitPrice + bufferCNY) * qty,
                            CostPerUnitZAR = Math.Round(salePricePerUnit, 4),
                            SalePriceZAR = Math.Round(salePricePerUnit * qty, 4),
                            SKU = $"{skuId}-{qty}",
                        });
                    }
                    await _db.SaveChangesAsync();

                    if (variantIsNew) result.Added++;
                    else result.Updated++;
                }

                if (!isNew && result.Added == 0 && result.Updated == 0)
                    result.Unchanged++;
            }
            catch (Exception ex)
            {
                result.Errors.Add($"Group '{group.Key}': {ex.Message}");
            }
        }

        return result;
    }

    private static string Slugify(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var slug = input.ToLowerInvariant();
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"\s+", "-");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"-+", "-");
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
    public string? Image_Filename { get; set; }
    public string? Image_Drive_Link { get; set; }
    public string? Source_URL { get; set; }
    public string? Date_Added { get; set; }
}
