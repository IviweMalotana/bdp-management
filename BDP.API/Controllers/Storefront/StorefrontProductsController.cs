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
                slug = string.IsNullOrEmpty(p.Slug) ? $"{System.Text.RegularExpressions.Regex.Replace(p.Name.ToLowerInvariant(), @"[^a-z0-9]+", "-").Trim('-')}-{p.Id}" : p.Slug,
                p.Name,
                p.Category,
                primaryUrl = p.Images.OrderBy(i => i.Id).FirstOrDefault()?.Url,
                primaryPrintArea = p.Images.OrderBy(i => i.Id).FirstOrDefault()?.PrintArea,
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

        // Fallback: match by "name-id" pattern for products with blank slugs
        if (product == null && slug.Length > 0)
        {
            var dashIdx = slug.LastIndexOf('-');
            if (dashIdx > 0 && int.TryParse(slug[(dashIdx + 1)..], out var fallbackId))
            {
                product = await _db.Products
                    .Include(p => p.Images)
                    .Include(p => p.Variants).ThenInclude(v => v.PricingTiers)
                    .Include(p => p.Supplier)
                    .FirstOrDefaultAsync(p => p.Id == fallbackId);
            }
        }

        if (product == null) return NotFound();

        // Load active global pricing settings
        var globalSettings = await _db.CustomisationSettings
            .Where(cs => cs.IsActive)
            .ToListAsync();

        // Load the bottle supplier's customisation options
        var supplierOptions = await _db.CustomisationOptions
            .Where(co => co.SupplierId == product.SupplierId && co.IsEnabled)
            .ToListAsync();

        // Build response: for each active global setting, check if this supplier has it enabled.
        // If the supplier has no options configured at all, treat all as available (default open).
        bool supplierHasAnyOptions = supplierOptions.Any();
        const decimal cnyToZar = 2.60m; // fallback; live rate used server-side for quotes
        var customisationOptions = globalSettings
            .Select(setting =>
            {
                // costPerUnitZAR = raw cost used by client to compute interpolated sale price
                // ColourChange costs nothing — client uses flat pricePerUnitZAR (R3)
                var costPerUnitZAR = setting.Type == "ColourChange"
                    ? 0m
                    : Math.Round(setting.CostPerUnitCNY * cnyToZar, 4);

                int moq;
                if (supplierHasAnyOptions)
                {
                    var supplierOpt = supplierOptions.FirstOrDefault(co => co.Type == setting.Type);
                    if (supplierOpt == null) return null;
                    moq = supplierOpt.MinimumQuantity ?? setting.DefaultMinimumQuantity;
                }
                else
                {
                    moq = setting.DefaultMinimumQuantity;
                }

                var optionId = supplierHasAnyOptions
                    ? supplierOptions.FirstOrDefault(co => co.Type == setting.Type)?.Id
                    : (int?)null;

                return new
                {
                    id = optionId,
                    type = setting.Type,
                    pricePerUnitZAR = setting.PricePerUnitZAR,   // sale price at MOQ anchor
                    costPerUnitZAR,                               // your cost (for client-side interpolation)
                    minimumQuantity = moq,
                };
            })
            .Where(opt => opt != null)
            .ToList();

        return Ok(new
        {
            product.Id,
            product.Slug,
            product.Name,
            product.Category,
            productType = product.ProductType,
            product.Description,
            product.UsageSuitability,
            // WeightKg is intentionally NOT exposed to customers — shipping is
            // shown as a price only, never as kg. Dimensions stay (product info).
            product.LengthCm,
            product.WidthCm,
            product.HeightCm,
            images = product.Images.OrderBy(i => i.SortOrder).Select(i => new { i.Url, i.AltText, i.IsPrimary, i.PrintArea }),
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
            customisationOptions,
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
                primaryPrintArea = p.Images.OrderBy(i => i.Id).FirstOrDefault()?.PrintArea,
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

