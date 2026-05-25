using BDP.API.Data;
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
                .ThenInclude(s => s.CustomisationOptions)
                    .ThenInclude(co => co.PricingTiers)
            .FirstOrDefaultAsync(p => p.Slug == slug);

        if (product == null) return NotFound();

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
                v.Size,
                v.BottleColour,
                v.LidColour,
                v.Texture,
                v.SKU,
                moq = v.PricingTiers.Any() ? v.PricingTiers.Min(t => t.Quantity) : 0,
                pricingTiers = v.PricingTiers.OrderBy(t => t.Quantity).Select(t => new
                {
                    t.Id,
                    t.Quantity,
                    t.SalePriceZAR
                })
            }),
            customisationOptions = product.Supplier.CustomisationOptions.Select(co => new
            {
                co.Id,
                co.Type,
                co.MinimumQuantity,
                pricingTiers = co.PricingTiers.OrderBy(t => t.Quantity).Select(t => new
                {
                    t.Id,
                    t.Quantity,
                    t.SalePriceZAR
                })
            })
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
            .GroupBy(p => p.Category)
            .Select(g => new { category = g.Key, productCount = g.Count() })
            .OrderBy(c => c.category)
            .ToListAsync();

        return Ok(categories);
    }
}
