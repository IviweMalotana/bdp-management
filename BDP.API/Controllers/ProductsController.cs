using BDP.API.Data;
using BDP.API.DTOs.Common;
using BDP.API.DTOs.Products;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly AIContentService _ai;
    private readonly ShopifyExportService _shopify;

    public ProductsController(
        AppDbContext context,
        AIContentService ai,
        ShopifyExportService shopify)
    {
        _context = context;
        _ai = ai;
        _shopify = shopify;
    }

    // GET /api/products
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? category = null)
    {
        var query = _context.Products
            .Include(p => p.Supplier)
            .Include(p => p.Variants)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResultDto<ProductDto>
        {
            Items = items.Select(MapToDto).ToList(),
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    // GET /api/products/categories
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.Products
            .Select(p => p.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
        return Ok(categories);
    }

    // GET /api/products/search?q=
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { message = "Search query 'q' is required." });

        var lower = q.ToLower();
        var products = await _context.Products
            .Include(p => p.Supplier)
            .Include(p => p.Variants)
            .Where(p => p.Name.ToLower().Contains(lower)
                     || p.Category.ToLower().Contains(lower)
                     || p.Slug.ToLower().Contains(lower))
            .OrderBy(p => p.Name)
            .Take(50)
            .ToListAsync();

        return Ok(products.Select(MapToDto));
    }

    // GET /api/products/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var product = await _context.Products
            .Include(p => p.Supplier)
            .Include(p => p.Variants)
                .ThenInclude(pv => pv.PricingTiers)
            .Include(p => p.Images)
            .Include(p => p.ProductCollections)
                .ThenInclude(pc => pc.Collection)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null) return NotFound(new { message = $"Product {id} not found." });

        return Ok(MapToDetailDto(product));
    }

    // POST /api/products
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var supplierExists = await _context.Suppliers.AnyAsync(s => s.Id == dto.SupplierId);
        if (!supplierExists)
            return BadRequest(new { message = "Supplier not found." });

        var product = new Product
        {
            Name = dto.Name,
            Category = dto.Category,
            Link1688 = dto.Link1688,
            Description = dto.Description,
            UsageSuitability = dto.UsageSuitability,
            MetaTitle = dto.MetaTitle,
            MetaDescription = dto.MetaDescription,
            MetaKeywords = dto.MetaKeywords,
            Slug = dto.Slug,
            SupplierId = dto.SupplierId,
            WeightKg = dto.WeightKg,
            LengthCm = dto.LengthCm,
            WidthCm = dto.WidthCm,
            HeightCm = dto.HeightCm,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        var created = await _context.Products
            .Include(p => p.Supplier)
            .Include(p => p.Variants)
            .FirstAsync(p => p.Id == product.Id);

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, MapToDto(created));
    }

    // PUT /api/products/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound(new { message = $"Product {id} not found." });

        var supplierExists = await _context.Suppliers.AnyAsync(s => s.Id == dto.SupplierId);
        if (!supplierExists)
            return BadRequest(new { message = "Supplier not found." });

        product.Name = dto.Name;
        product.Category = dto.Category;
        product.Link1688 = dto.Link1688;
        product.Description = dto.Description;
        product.UsageSuitability = dto.UsageSuitability;
        product.MetaTitle = dto.MetaTitle;
        product.MetaDescription = dto.MetaDescription;
        product.MetaKeywords = dto.MetaKeywords;
        product.Slug = dto.Slug;
        product.SupplierId = dto.SupplierId;
        product.WeightKg = dto.WeightKg;
        product.LengthCm = dto.LengthCm;
        product.WidthCm = dto.WidthCm;
        product.HeightCm = dto.HeightCm;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var updated = await _context.Products
            .Include(p => p.Supplier)
            .Include(p => p.Variants).ThenInclude(pv => pv.PricingTiers)
            .Include(p => p.Images)
            .Include(p => p.ProductCollections).ThenInclude(pc => pc.Collection)
            .FirstAsync(p => p.Id == id);

        return Ok(MapToDetailDto(updated));
    }

    // DELETE /api/products/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound(new { message = $"Product {id} not found." });

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/products/{id}/variants
    [HttpPost("{id:int}/variants")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddVariant(int id, [FromBody] CreateVariantDto dto)
    {
        if (!await _context.Products.AnyAsync(p => p.Id == id))
            return NotFound(new { message = $"Product {id} not found." });

        var variant = new ProductVariant
        {
            ProductId = id,
            Size = dto.Size,
            BottleColour = dto.BottleColour,
            LidColour = dto.LidColour,
            Texture = dto.Texture,
            SKU = dto.SKU,
            IsActive = dto.IsActive
        };
        _context.ProductVariants.Add(variant);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id }, new ProductVariantDto
        {
            Id = variant.Id, Size = variant.Size, BottleColour = variant.BottleColour,
            LidColour = variant.LidColour, Texture = variant.Texture,
            SKU = variant.SKU, IsActive = variant.IsActive, PricingTiers = new()
        });
    }

    // PUT /api/products/{id}/variants/{variantId}
    [HttpPut("{id:int}/variants/{variantId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateVariant(int id, int variantId, [FromBody] CreateVariantDto dto)
    {
        var variant = await _context.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == id);
        if (variant == null) return NotFound();

        variant.Size = dto.Size;
        variant.BottleColour = dto.BottleColour;
        variant.LidColour = dto.LidColour;
        variant.Texture = dto.Texture;
        variant.SKU = dto.SKU;
        variant.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/products/{id}/variants/{variantId}
    [HttpDelete("{id:int}/variants/{variantId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteVariant(int id, int variantId)
    {
        var variant = await _context.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == id);
        if (variant == null) return NotFound();
        _context.ProductVariants.Remove(variant);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/products/{id}/images (multipart)
    [HttpPost("{id:int}/images")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UploadImage(int id, IFormFile file,
        [FromForm] string? altText, [FromForm] bool isPrimary = false)
    {
        if (!await _context.Products.AnyAsync(p => p.Id == id))
            return NotFound(new { message = $"Product {id} not found." });
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp"))
            return BadRequest(new { message = "Only jpg, png, webp images are accepted." });

        var dir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "products");
        Directory.CreateDirectory(dir);
        var fileName = $"{id}-{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(dir, fileName);

        await using (var stream = System.IO.File.Create(filePath))
            await file.CopyToAsync(stream);

        if (isPrimary)
            await _context.ProductImages.Where(i => i.ProductId == id)
                .ForEachAsync(i => i.IsPrimary = false);

        var sortOrder = await _context.ProductImages.Where(i => i.ProductId == id).CountAsync();
        var image = new ProductImage
        {
            ProductId = id,
            Url = $"/images/products/{fileName}",
            AltText = altText ?? string.Empty,
            SortOrder = sortOrder,
            IsPrimary = isPrimary
        };
        _context.ProductImages.Add(image);
        await _context.SaveChangesAsync();

        return Ok(new ProductImageDto
        {
            Id = image.Id, Url = image.Url, AltText = image.AltText,
            SortOrder = image.SortOrder, IsPrimary = image.IsPrimary
        });
    }

    // DELETE /api/products/{id}/images/{imageId}
    [HttpDelete("{id:int}/images/{imageId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteImage(int id, int imageId)
    {
        var image = await _context.ProductImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.ProductId == id);
        if (image == null) return NotFound();

        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot",
            image.Url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(filePath))
            System.IO.File.Delete(filePath);

        _context.ProductImages.Remove(image);
        await _context.SaveChangesAsync();
        return NoContent();
    }


    // GET /api/products/shopify-export?productIds=1,2,3 (stubbed)
    [HttpGet("shopify-export")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ShopifyExport([FromQuery] string productIds)
    {
        if (string.IsNullOrWhiteSpace(productIds))
            return BadRequest(new { message = "productIds query parameter is required." });

        var ids = productIds.Split(',')
            .Select(s => int.TryParse(s.Trim(), out var n) ? (int?)n : null)
            .Where(n => n.HasValue)
            .Select(n => n!.Value)
            .ToList();

        if (!ids.Any())
            return BadRequest(new { message = "No valid product IDs provided." });

        var csvBytes = await _shopify.ExportToCsv(ids);
        var filename = $"bdp_export_{DateTime.UtcNow:yyyyMMdd}.csv";

        return File(csvBytes, "text/csv", filename);
    }

    // ── Mappers ────────────────────────────────────────────────────────────

    private static ProductDto MapToDto(Product p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Category = p.Category,
        Link1688 = p.Link1688,
        Description = p.Description,
        UsageSuitability = p.UsageSuitability,
        MetaTitle = p.MetaTitle,
        MetaDescription = p.MetaDescription,
        MetaKeywords = p.MetaKeywords,
        Slug = p.Slug,
        SupplierId = p.SupplierId,
        SupplierName = p.Supplier?.Name ?? string.Empty,
        WeightKg = p.WeightKg,
        LengthCm = p.LengthCm,
        WidthCm = p.WidthCm,
        HeightCm = p.HeightCm,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
        Variants = p.Variants?.Select(pv => new ProductVariantDto
        {
            Id = pv.Id,
            Size = pv.Size,
            BottleColour = pv.BottleColour,
            LidColour = pv.LidColour,
            Texture = pv.Texture,
            SKU = pv.SKU,
            IsActive = pv.IsActive,
            PricingTiers = pv.PricingTiers?.OrderBy(t => t.Quantity).Select(t => new VariantPricingTierDto
            {
                Id = t.Id,
                Quantity = t.Quantity,
                CostCNY = t.CostCNY,
                CostWithShippingCNY = t.CostWithShippingCNY,
                CostWithDutiesCNY = t.CostWithDutiesCNY,
                CostPerUnitZAR = t.CostPerUnitZAR,
                SalePriceZAR = t.SalePriceZAR,
                SKU = t.SKU,
            }).ToList() ?? new(),
        }).ToList() ?? new(),
    };

    private static ProductDetailDto MapToDetailDto(Product p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Category = p.Category,
        Link1688 = p.Link1688,
        Description = p.Description,
        UsageSuitability = p.UsageSuitability,
        MetaTitle = p.MetaTitle,
        MetaDescription = p.MetaDescription,
        MetaKeywords = p.MetaKeywords,
        Slug = p.Slug,
        SupplierId = p.SupplierId,
        SupplierName = p.Supplier?.Name ?? string.Empty,
        WeightKg = p.WeightKg,
        LengthCm = p.LengthCm,
        WidthCm = p.WidthCm,
        HeightCm = p.HeightCm,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
        Variants = p.Variants?.Select(pv => new ProductVariantDto
        {
            Id = pv.Id,
            Size = pv.Size,
            BottleColour = pv.BottleColour,
            LidColour = pv.LidColour,
            Texture = pv.Texture,
            SKU = pv.SKU,
            IsActive = pv.IsActive,
            PricingTiers = pv.PricingTiers?.OrderBy(t => t.Quantity).Select(t => new VariantPricingTierDto
            {
                Id = t.Id,
                Quantity = t.Quantity,
                CostCNY = t.CostCNY,
                CostWithShippingCNY = t.CostWithShippingCNY,
                CostWithDutiesCNY = t.CostWithDutiesCNY,
                CostPerUnitZAR = t.CostPerUnitZAR,
                SalePriceZAR = t.SalePriceZAR,
                SKU = t.SKU,
            }).ToList() ?? new(),
        }).ToList() ?? new(),
        Images = p.Images?.OrderBy(i => i.SortOrder).Select(i => new ProductImageDto
        {
            Id = i.Id,
            Url = i.Url,
            AltText = i.AltText,
            SortOrder = i.SortOrder,
            IsPrimary = i.IsPrimary,
        }).ToList() ?? new(),
        Collections = p.ProductCollections?.Select(pc => pc.Collection?.Name ?? string.Empty).ToList() ?? new(),
    };
}

