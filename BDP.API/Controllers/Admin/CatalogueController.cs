using BDP.API.Data;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace BDP.API.Controllers.Admin;

[ApiController]
[Route("api/admin/catalogue")]
[Authorize(Roles = "Admin,Manager")]
public class CatalogueController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly CatalogueImportService _importService;
    private readonly GoogleDriveService _driveService;
    private readonly IHttpClientFactory _http;

    public CatalogueController(
        AppDbContext db,
        CatalogueImportService importService,
        GoogleDriveService driveService,
        IHttpClientFactory http)
    {
        _db = db;
        _importService = importService;
        _driveService = driveService;
        _http = http;
    }

    private const string SheetId = "1IBmXoxiFy2lWtTtLzmeXZghx_y3_pySq5Io3EquNbl8";

    /// <summary>
    /// POST /api/admin/catalogue/import-sheet
    /// Fetches the master catalogue Google Sheet and imports it directly.
    /// </summary>
    [HttpPost("import-sheet")]
    public async Task<IActionResult> ImportSheet()
    {
        var client = _http.CreateClient();
        Stream stream;
        try
        {
            var response = await client.GetAsync(
                $"https://docs.google.com/spreadsheets/d/{SheetId}/export?format=csv&gid=0");
            response.EnsureSuccessStatusCode();
            stream = await response.Content.ReadAsStreamAsync();
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = $"Failed to fetch Google Sheet: {ex.Message}" });
        }

        var result = await _importService.ImportFromStreamAsync(stream);

        return Ok(new
        {
            added = result.Added,
            updated = result.Updated,
            unchanged = result.Unchanged,
            imagesSet = result.ImagesSet,
            imagesCleared = result.ImagesCleared,
            productsDeleted = result.ProductsDeleted,
            variantsDeleted = result.VariantsDeleted,
            errors = result.Errors,
            success = result.Errors.Count == 0,
        });
    }

    /// <summary>
    /// POST /api/admin/catalogue/import
    /// Accepts multipart/form-data with a "file" field (CSV).
    /// </summary>
    [HttpPost("import")]
    public async Task<IActionResult> ImportCsv(IFormFile? file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file provided. Please upload a CSV file." });

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".csv")
            return BadRequest(new { message = "Only CSV files are accepted." });

        await using var stream = file.OpenReadStream();
        var result = await _importService.ImportFromStreamAsync(stream);

        return Ok(new
        {
            added = result.Added,
            updated = result.Updated,
            unchanged = result.Unchanged,
            imagesSet = result.ImagesSet,
            imagesCleared = result.ImagesCleared,
            productsDeleted = result.ProductsDeleted,
            variantsDeleted = result.VariantsDeleted,
            errors = result.Errors,
            success = result.Errors.Count == 0,
        });
    }

    /// <summary>
    /// GET /api/admin/catalogue/products
    /// Returns paginated product list with variant count.
    /// </summary>
    [HttpGet("products")]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.Products
            .Include(p => p.Variants)
            .Include(p => p.Supplier)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p =>
                p.Name.Contains(search) ||
                (p.SupplierItemNumber != null && p.SupplierItemNumber.Contains(search)) ||
                p.Variants.Any(v => v.SkuId != null && v.SkuId.Contains(search)));
        }

        var total = await query.CountAsync();
        var products = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = products.Select(p => new
        {
            p.Id,
            p.Name,
            p.Slug,
            p.Category,
            p.SupplierItemNumber,
            p.ProductType,
            p.ShapeStyle,
            supplierName = p.Supplier?.Name,
            variantCount = p.Variants.Count,
            variants = p.Variants.Select(v => new
            {
                v.Id,
                v.SkuId,
                v.SKU,
                v.SpecificationSize,
                v.BaseBodyColor,
                v.LidCapColor,
                v.UnitPriceCNY,
                v.SupplierMoq,
                v.IsActive,
            }),
        });

        return Ok(new { total, page, pageSize, items });
    }

    /// <summary>
    /// POST /api/admin/catalogue/refresh-seo
    /// Retroactively assigns human names and regenerates SEO fields for all products.
    /// </summary>
    [HttpPost("refresh-seo")]
    public async Task<IActionResult> RefreshSeo()
    {
        var products = await _db.Products
            .Include(p => p.Variants)
            .ToListAsync();

        int updated = 0;

        foreach (var product in products)
        {
            bool changed = false;

            // Assign unique human name if missing or still a multi-word legacy name
            bool needsName = string.IsNullOrWhiteSpace(product.Name)
                || product.Name.Contains(' ');

            if (needsName)
            {
                product.Name = await ProductNameService.AssignUniqueNameAsync(_db);
                // Re-slug using new name so URLs stay consistent
                product.Slug = SlugifyStatic($"{product.Name} {product.SupplierItemNumber}");
                changed = true;
            }

            // Derive SEO inputs from first variant (if any)
            var firstVariant = product.Variants.FirstOrDefault();
            var variantCount = product.Variants.Count;
            var sampleNames = product.Variants
                .Where(v => !string.IsNullOrWhiteSpace(v.ColorVariantName))
                .Select(v => v.ColorVariantName!)
                .Distinct()
                .Take(3)
                .ToList();

            var metaTitle = ProductSeoGenerator.GenerateSeoTitleFromFields(
                firstVariant?.SpecificationSize,
                firstVariant?.BaseBodyFinish,
                firstVariant?.BodyMaterial,
                product.ProductType ?? product.Category);

            var description = ProductSeoGenerator.GenerateDescriptionFromFields(
                firstVariant?.SpecificationSize,
                firstVariant?.BaseBodyFinish,
                firstVariant?.BodyMaterial,
                product.ProductType ?? product.Category,
                firstVariant?.ClosureType,
                variantCount,
                sampleNames);

            var metaDesc = ProductSeoGenerator.GenerateMetaDescriptionFromFields(
                firstVariant?.SpecificationSize,
                firstVariant?.BaseBodyFinish,
                firstVariant?.BodyMaterial,
                product.ProductType ?? product.Category,
                firstVariant?.ClosureType);

            var metaKw = ProductSeoGenerator.GenerateMetaKeywordsFromFields(
                firstVariant?.SpecificationSize,
                firstVariant?.BaseBodyFinish,
                firstVariant?.BodyMaterial,
                product.ProductType ?? product.Category,
                firstVariant?.ClosureType);

            if (product.MetaTitle != metaTitle || product.Description != description
                || product.MetaDescription != metaDesc || product.MetaKeywords != metaKw || changed)
            {
                product.MetaTitle = metaTitle;
                product.Description = description;
                product.MetaDescription = metaDesc;
                product.MetaKeywords = metaKw;
                product.UpdatedAt = DateTime.UtcNow;
                updated++;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { updated });
    }

    /// <summary>
    /// POST /api/admin/catalogue/rebuild-collections
    /// Retroactively assigns all products with a ProductType to their correct collection.
    /// </summary>
    [HttpPost("rebuild-collections")]
    public async Task<IActionResult> RebuildCollections()
    {
        var products = await _db.Products
            .Where(p => !string.IsNullOrEmpty(p.ProductType))
            .ToListAsync();

        int collectionsCreated = 0;
        int assignmentsAdded = 0;

        foreach (var product in products)
        {
            var collectionName = MapProductTypeToCollection(product.ProductType!);
            var slug = SlugifyStatic(collectionName);

            var collection = await _db.Collections.FirstOrDefaultAsync(c => c.Slug == slug);
            if (collection == null)
            {
                collection = new BDP.API.Models.Collection
                {
                    Name = collectionName,
                    Slug = slug,
                    Description = GenerateCollectionDescription(collectionName),
                    ImageUrl = null,
                };
                _db.Collections.Add(collection);
                await _db.SaveChangesAsync();
                collectionsCreated++;
            }

            var alreadyIn = await _db.ProductCollections
                .AnyAsync(pc => pc.CollectionId == collection.Id && pc.ProductId == product.Id);
            if (!alreadyIn)
            {
                _db.ProductCollections.Add(new BDP.API.Models.ProductCollection
                {
                    CollectionId = collection.Id,
                    ProductId = product.Id,
                });
                assignmentsAdded++;
            }
        }

        await _db.SaveChangesAsync();
        return Ok(new { collectionsCreated, assignmentsAdded });
    }

    /// <summary>
    /// Temporary test endpoint to verify Google Drive integration is working.
    /// Uploads a small text file to your "BDP - AI Generated Images" folder.
    /// </summary>
    [HttpPost("test-drive-upload")]
    public async Task<IActionResult> TestDriveUpload()
    {
        if (!_driveService.IsConfigured)
        {
            return BadRequest(new 
            { 
                success = false, 
                message = "GoogleDriveService is not configured. Make sure GoogleDrive:ServiceAccountJsonPath and GoogleDrive:DefaultFolderId are set in user secrets." 
            });
        }

        var testContent = $"Hello from BDP - Test upload at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC";
        var bytes = System.Text.Encoding.UTF8.GetBytes(testContent);

        var link = await _driveService.UploadFileAsync(bytes, "bdp-drive-test.txt", "text/plain");

        if (string.IsNullOrEmpty(link))
        {
            return StatusCode(500, new { success = false, message = "Upload failed. Check logs for details (service account permissions, folder sharing, etc.)." });
        }

        return Ok(new
        {
            success = true,
            message = "Test file uploaded successfully!",
            fileName = "bdp-drive-test.txt",
            driveLink = link
        });
    }

    public class GenerateImagesRequest
    {
        public List<int>? ProductIds { get; set; }
        public bool OnlyMissing { get; set; } = true;
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

    private static string SlugifyStatic(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var slug = input.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        return slug.Trim('-');
    }
}
