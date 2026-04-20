using BDP.API.Data;
using BDP.API.DTOs.Common;
using BDP.API.DTOs.Inventory;
using BDP.API.DTOs.Products;
using ProductPricingTierDto = BDP.API.DTOs.Products.ProductPricingTierDto;
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
    private readonly PricingService _pricing;
    private readonly AIContentService _ai;
    private readonly ShopifyExportService _shopify;

    public ProductsController(
        AppDbContext context,
        PricingService pricing,
        AIContentService ai,
        ShopifyExportService shopify)
    {
        _context = context;
        _pricing = pricing;
        _ai = ai;
        _shopify = shopify;
    }

    // GET /api/products
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? category = null,
        [FromQuery] string? colour = null,
        [FromQuery] string? texture = null)
    {
        var query = _context.Products
            .Include(p => p.PricingTiers)
            .Include(p => p.Supplier)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(p => p.Category == category);
        if (!string.IsNullOrWhiteSpace(colour))
            query = query.Where(p => p.BottleColour == colour || p.LidColour == colour);
        if (!string.IsNullOrWhiteSpace(texture))
            query = query.Where(p => p.Texture == texture);

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
            .Include(p => p.PricingTiers)
            .Include(p => p.Supplier)
            .Where(p => p.Name.ToLower().Contains(lower)
                     || p.SKUBase.ToLower().Contains(lower)
                     || p.Category.ToLower().Contains(lower))
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
            .Include(p => p.PricingTiers)
            .Include(p => p.ProductPricingTiers)
            .Include(p => p.InventoryItems)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null) return NotFound(new { message = $"Product {id} not found." });

        // Load customisation options for the supplier to populate logo prices
        var customisationOptions = await _context.CustomisationOptions
            .Where(co => co.SupplierId == product.SupplierId)
            .ToListAsync();

        return Ok(MapToDetailDto(product, customisationOptions));
    }

    // POST /api/products/calculate-pricing
    [HttpPost("calculate-pricing")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CalculatePricing([FromBody] CalculatePricingRequestDto dto)
    {
        var (rate, costZAR, tiers) = await _pricing.CalculatePricingTiers(
            dto.CostCNY, dto.ProductName, dto.Category, dto.Size,
            dto.BottleColour, dto.LidColour, dto.Texture);

        return Ok(new CalculatePricingResponseDto
        {
            ExchangeRate = rate,
            CostPerUnitZAR = costZAR,
            Tiers = tiers,
        });
    }

    // POST /api/products/generate-ai-content
    [HttpPost("generate-ai-content")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GenerateAiContent([FromForm] IFormFile image,
        [FromForm] string productName, [FromForm] string size,
        [FromForm] string category,   [FromForm] string colour,
        [FromForm] string texture)
    {
        if (!_ai.IsConfigured)
            return BadRequest(new { message = "OpenAI API key is not configured in appsettings.json." });

        if (image == null || image.Length == 0)
            return BadRequest(new { message = "Image file is required." });

        using var ms = new MemoryStream();
        await image.CopyToAsync(ms);
        var bytes = ms.ToArray();

        var (title, htmlBody) = await _ai.GenerateProductContent(
            productName, size, category, colour, texture, bytes, image.ContentType);

        return Ok(new { title, htmlBody });
    }

    // GET /api/products/shopify-export?productIds=1,2,3
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
        var filename = $"bdp_shopify_export_{DateTime.UtcNow:yyyyMMdd}.csv";

        return File(csvBytes, "text/csv", filename);
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
            SKUBase = dto.SKUBase,
            Category = dto.Category,
            SizeML = dto.SizeML,
            BottleColour = dto.BottleColour,
            LidColour = dto.LidColour,
            Texture = dto.Texture,
            CostCNY = dto.CostCNY,
            CostWithShippingCNY = dto.CostWithShippingCNY,
            CostPerUnitZAR = dto.CostPerUnitZAR,
            SupplierLink = dto.SupplierLink,
            SupplierId = dto.SupplierId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            DateAdded = DateTime.UtcNow
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        foreach (var location in new[] { "Cape Town", "China", "ZQ Warehouse" })
        {
            _context.InventoryItems.Add(new InventoryItem
            {
                ProductId = product.Id,
                SKU = dto.SKUBase,
                Quantity = 0,
                Location = location,
                OnHandStock = 0,
                AvailableStock = 0,
                IsStocked = false,
                UpdatedAt = DateTime.UtcNow
            });
        }
        await _context.SaveChangesAsync();

        var created = await _context.Products
            .Include(p => p.PricingTiers)
            .Include(p => p.InventoryItems)
            .Include(p => p.Supplier)
            .FirstAsync(p => p.Id == product.Id);

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, MapToDetailDto(created));
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
        product.SKUBase = dto.SKUBase;
        product.Category = dto.Category;
        product.SizeML = dto.SizeML;
        product.BottleColour = dto.BottleColour;
        product.LidColour = dto.LidColour;
        product.Texture = dto.Texture;
        product.CostCNY = dto.CostCNY;
        product.CostWithShippingCNY = dto.CostWithShippingCNY;
        product.CostPerUnitZAR = dto.CostPerUnitZAR;
        product.SupplierLink = dto.SupplierLink;
        product.SupplierId = dto.SupplierId;
        product.IsActive = dto.IsActive;
        if (dto.ShopifyTitle != null) product.ShopifyTitle = dto.ShopifyTitle;
        if (dto.ShopifyBodyHtml != null) product.ShopifyBodyHtml = dto.ShopifyBodyHtml;

        await _context.SaveChangesAsync();

        var updated = await _context.Products
            .Include(p => p.PricingTiers)
            .Include(p => p.InventoryItems)
            .Include(p => p.Supplier)
            .FirstAsync(p => p.Id == id);

        return Ok(MapToDetailDto(updated));
    }

    // DELETE /api/products/{id} — soft delete
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound(new { message = $"Product {id} not found." });

        product.IsActive = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/products/{id}/pricing-tiers
    [HttpPost("{id:int}/pricing-tiers")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SetPricingTiers(int id, [FromBody] SetPricingTiersDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var product = await _context.Products
            .Include(p => p.PricingTiers)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product == null) return NotFound(new { message = $"Product {id} not found." });

        _context.PricingTiers.RemoveRange(product.PricingTiers);

        foreach (var t in dto.Tiers)
        {
            _context.PricingTiers.Add(new PricingTier
            {
                ProductId = id,
                SKU = t.SKU,
                Quantity = t.Quantity,
                MarkupPercent = t.MarkupPercent,
                SalePricePerUnit = t.SalePricePerUnit,
                TotalSalePrice = t.TotalSalePrice,
                TotalCostPrice = t.TotalCostPrice,
                ProfitPerUnit = t.ProfitPerUnit,
                TotalProfit = t.TotalProfit,
                MarginPercent = t.MarginPercent,
                LogoSilkScreen = t.LogoSilkScreen,
                LogoHotStamping = t.LogoHotStamping,
                DeliveryCostZAR = t.DeliveryCostZAR,
                CompareAtPrice = t.CompareAtPrice,
            });
        }

        await _context.SaveChangesAsync();

        var tiers = await _context.PricingTiers
            .Where(pt => pt.ProductId == id)
            .OrderBy(pt => pt.Quantity)
            .ToListAsync();

        return Ok(tiers.Select(MapPricingTierToDto));
    }

    // ── Mappers ────────────────────────────────────────────────────────────
    private static ProductDto MapToDto(Product p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        SKUBase = p.SKUBase,
        Category = p.Category,
        SizeML = p.SizeML,
        BottleColour = p.BottleColour,
        LidColour = p.LidColour,
        Texture = p.Texture,
        CostCNY = p.CostCNY,
        CostWithShippingCNY = p.CostWithShippingCNY,
        CostPerUnitZAR = p.CostPerUnitZAR,
        SupplierLink = p.SupplierLink,
        SupplierId = p.SupplierId,
        SupplierName = p.Supplier?.Name ?? string.Empty,
        IsActive = p.IsActive,
        ShopifyTitle = p.ShopifyTitle,
        ShopifyBodyHtml = p.ShopifyBodyHtml,
        CreatedAt = p.CreatedAt,
        DateAdded = p.DateAdded,
        PricingTiers = p.PricingTiers?.Select(MapPricingTierToDto).ToList() ?? new()
    };

    internal static ProductDetailDto MapToDetailDto(Product p,
        IEnumerable<BDP.API.Models.CustomisationOption>? customisationOptions = null) => new()
    {
        Id = p.Id,
        Name = p.Name,
        SKUBase = p.SKUBase,
        Category = p.Category,
        SizeML = p.SizeML,
        BottleColour = p.BottleColour,
        LidColour = p.LidColour,
        Texture = p.Texture,
        CostCNY = p.CostCNY,
        CostWithShippingCNY = p.CostWithShippingCNY,
        CostPerUnitZAR = p.CostPerUnitZAR,
        SupplierLink = p.SupplierLink,
        SupplierId = p.SupplierId,
        SupplierName = p.Supplier?.Name ?? string.Empty,
        IsActive = p.IsActive,
        ShopifyTitle = p.ShopifyTitle,
        ShopifyBodyHtml = p.ShopifyBodyHtml,
        CreatedAt = p.CreatedAt,
        DateAdded = p.DateAdded,
        PricingTiers = p.PricingTiers?.Select(MapPricingTierToDto).ToList() ?? new(),
        ProductPricingTiers = MapProductPricingTiers(p, customisationOptions),
        InventoryItems = p.InventoryItems?.Select(MapInventoryToDto).ToList() ?? new()
    };

    private static List<ProductPricingTierDto> MapProductPricingTiers(
        Product p,
        IEnumerable<BDP.API.Models.CustomisationOption>? options)
    {
        var optionsList = options?.ToList() ?? new();
        var silkByQty = optionsList
            .Where(co => co.Type == BDP.API.Models.CustomisationType.SilkScreen)
            .ToDictionary(co => co.MinQuantity, co => co.TotalPriceZAR);
        var hotByQty = optionsList
            .Where(co => co.Type == BDP.API.Models.CustomisationType.HotStamping)
            .ToDictionary(co => co.MinQuantity, co => co.TotalPriceZAR);

        return p.ProductPricingTiers?
            .OrderBy(t => t.Quantity)
            .Select(t => new ProductPricingTierDto
            {
                Id = t.Id,
                Quantity = t.Quantity,
                SalePriceZAR = t.SalePriceZAR,
                DeliveryCostZAR = t.DeliveryCostZAR,
                SilkScreenLogoZAR = silkByQty.TryGetValue(t.Quantity, out var s) ? s : null,
                HotStampingLogoZAR = hotByQty.TryGetValue(t.Quantity, out var h) ? h : null,
            }).ToList() ?? new();
    }

    internal static PricingTierDto MapPricingTierToDto(PricingTier pt) => new()
    {
        Id = pt.Id,
        ProductId = pt.ProductId,
        SKU = pt.SKU,
        Quantity = pt.Quantity,
        MarkupPercent = pt.MarkupPercent,
        SalePricePerUnit = pt.SalePricePerUnit,
        TotalSalePrice = pt.TotalSalePrice,
        TotalCostPrice = pt.TotalCostPrice,
        ProfitPerUnit = pt.ProfitPerUnit,
        TotalProfit = pt.TotalProfit,
        MarginPercent = pt.MarginPercent,
        LogoSilkScreen = pt.LogoSilkScreen,
        LogoHotStamping = pt.LogoHotStamping,
        DeliveryCostZAR = pt.DeliveryCostZAR,
        CompareAtPrice = pt.CompareAtPrice,
    };

    internal static InventoryItemDto MapInventoryToDto(InventoryItem ii) => new()
    {
        Id = ii.Id,
        ProductId = ii.ProductId,
        ProductName = ii.Product?.Name ?? string.Empty,
        SKU = ii.SKU,
        Quantity = ii.Quantity,
        Location = ii.Location,
        OnHandStock = ii.OnHandStock,
        IncomingStock = ii.IncomingStock,
        CommittedStock = ii.CommittedStock,
        AvailableStock = ii.AvailableStock,
        IsStocked = ii.IsStocked,
        UpdatedAt = ii.UpdatedAt
    };
}
