using BDP.API.Data;
using BDP.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront")]
public class StorefrontProductsController : ControllerBase
{
    private readonly AppDbContext _db;

    public StorefrontProductsController(AppDbContext db) => _db = db;

    [HttpGet("products")]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.Products
            .Include(p => p.Images)
            .Include(p => p.Variants).ThenInclude(v => v.PricingTiers)
            .Where(p => p.Variants.Any())   // hide shell products with no variants
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || (p.Description != null && p.Description.Contains(search)));

        var total = await query.CountAsync();
        var products = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = products.Select(p =>
        {
            var allTiers = p.Variants.SelectMany(v => v.PricingTiers).ToList();
            var basePrice = allTiers.Any() ? allTiers.Min(t => t.Quantity > 0 ? t.SalePriceZAR / t.Quantity : 0m) : 0m;
            var lowestMoq = allTiers.Any() ? allTiers.Min(t => t.Quantity) : 0;
            return new
            {
                p.Id,
                p.Slug,
                p.Name,
                p.Category,
                primaryUrl = p.Images.OrderBy(i => i.Id).FirstOrDefault()?.Url,
                basePrice,
                lowestMoq,
                variants = p.Variants.Select(v => new { v.Id, v.Size, colour = v.BottleColour, v.Texture })
            };
        });

        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("products/{slug}")]
    public async Task<IActionResult> GetProductBySlug(string slug)
    {
        var product = await _db.Products
            .Include(p => p.Images)
            .Include(p => p.Variants)
                .ThenInclude(v => v.PricingTiers)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Slug == slug);

        if (product == null) return NotFound();

        // Customisation options (Silk Screen, Hot Stamping) come from Charlie Branding
        // regardless of which supplier made the bottle — Charlie prints on any bottle.
        var charlie = await _db.Suppliers
            .Include(s => s.CustomisationOptions).ThenInclude(co => co.PricingTiers)
            .FirstOrDefaultAsync(s => EF.Functions.ILike(s.Name, "%Charlie%"));

        var supplierOptions = (charlie?.CustomisationOptions ?? new List<CustomisationOption>())
            .Select(co => new StorefrontCustomisationOption
            {
                Id = co.Id,
                Type = co.Type,
                MinimumQuantity = co.MinimumQuantity,
                PricePerUnitZAR = null,
                PricingTiers = co.PricingTiers.OrderBy(t => t.Quantity)
                    .Select(t => new StorefrontTier { Id = t.Id, Quantity = t.Quantity, SalePriceZAR = t.SalePriceZAR })
                    .ToList(),
            }).ToList();

        supplierOptions.Add(new StorefrontCustomisationOption
        {
            Id = 0,
            Type = "ColourChange",
            MinimumQuantity = 100,
            PricePerUnitZAR = 2.00m,
            PricingTiers = new List<StorefrontTier>(),
        });

        return Ok(new
        {
            product.Id,
            product.Slug,
            product.Name,
            product.Category,
            product.Description,
            product.UsageSuitability,
            product.WeightKg,
            product.LengthCm,
            product.WidthCm,
            product.HeightCm,
            images = product.Images.OrderBy(i => i.SortOrder).Select(i => new { i.Url, i.AltText, i.IsPrimary }),
            variants = product.Variants.Select(v => new
            {
                v.Id,
                // Legacy fields
                v.Size,
                v.BottleColour,
                v.LidColour,
                v.Texture,
                v.SKU,
                // Catalogue fields
                skuId = v.SkuId,
                specificationSize = v.SpecificationSize,
                colorVariantName = v.ColorVariantName,
                baseBodyColor = v.BaseBodyColor,
                baseBodyFinish = v.BaseBodyFinish,
                lidCapColor = v.LidCapColor,
                lidCapFinish = v.LidCapFinish,
                lidCapMaterial = v.LidCapMaterial,
                closureType = v.ClosureType,
                bodyMaterial = v.BodyMaterial,
                accessoriesIncluded = v.AccessoriesIncluded,
                unitPriceCNY = v.UnitPriceCNY,
                moq = v.PricingTiers.Any() ? v.PricingTiers.Min(t => t.Quantity) : (v.SupplierMoq > 0 ? v.SupplierMoq : 10),
                pricingTiers = v.PricingTiers.OrderBy(t => t.Quantity).Select(t => new
                {
                    t.Id,
                    t.Quantity,
                    t.SalePriceZAR,
                    t.CostPerUnitZAR,
                })
            }),
            customisationOptions = supplierOptions,
        });
    }

    [HttpGet("collections")]
    public async Task<IActionResult> GetCollections()
    {
        var collections = await _db.Collections
            .Include(c => c.ProductCollections)
            .OrderBy(c => c.Name)
            .ToListAsync();

        return Ok(collections.Select(c => new
        {
            c.Id,
            c.Name,
            c.Slug,
            c.Description,
            c.ImageUrl,
            productCount = c.ProductCollections.Count
        }));
    }

    [HttpGet("collections/{slug}")]
    public async Task<IActionResult> GetCollectionBySlug(string slug)
    {
        var collection = await _db.Collections
            .Include(c => c.ProductCollections)
                .ThenInclude(pc => pc.Product)
                    .ThenInclude(p => p.Images)
            .Include(c => c.ProductCollections)
                .ThenInclude(pc => pc.Product)
                    .ThenInclude(p => p.Variants)
                        .ThenInclude(v => v.PricingTiers)
            .FirstOrDefaultAsync(c => c.Slug == slug);

        if (collection == null) return NotFound();

        return Ok(new
        {
            collection.Id,
            collection.Name,
            collection.Slug,
            collection.Description,
            collection.ImageUrl,
            products = collection.ProductCollections.Select(pc =>
            {
                var p = pc.Product;
                var allTiers = p.Variants.SelectMany(v => v.PricingTiers).ToList();
                return new
                {
                    p.Id,
                    p.Slug,
                    p.Name,
                    p.Category,
                    primaryUrl = p.Images.OrderBy(i => i.Id).FirstOrDefault()?.Url,
                    basePrice = allTiers.Any() ? allTiers.Min(t => t.SalePriceZAR) : 0m,
                    lowestMoq = allTiers.Any() ? allTiers.Min(t => t.Quantity) : 0
                };
            })
        });
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _db.Products
            .Where(p => p.Variants.Any())   // exclude shell products
            .GroupBy(p => p.Category)
            .Select(g => new { category = g.Key, productCount = g.Count() })
            .OrderBy(c => c.category)
            .ToListAsync();

        return Ok(categories);
    }
}

// ── Helper DTOs for type-safe customisation option serialisation ──────────────

internal class StorefrontTier
{
    public int Id { get; set; }
    public int Quantity { get; set; }
    public decimal SalePriceZAR { get; set; }
}

internal class StorefrontCustomisationOption
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public int MinimumQuantity { get; set; }
    public decimal? PricePerUnitZAR { get; set; }
    public List<StorefrontTier> PricingTiers { get; set; } = new();
}
