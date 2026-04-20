using BDP.API.Data;
using BDP.API.DTOs.Inventory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly AppDbContext _context;

    public InventoryController(AppDbContext context) => _context = context;

    // GET /api/inventory?location=X&productId=Y&isStocked=true
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? location = null,
        [FromQuery] int? productId = null,
        [FromQuery] bool? isStocked = null)
    {
        var query = _context.InventoryItems
            .Include(ii => ii.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(location))
            query = query.Where(ii => ii.Location == location);
        if (productId.HasValue)
            query = query.Where(ii => ii.ProductId == productId.Value);
        if (isStocked.HasValue)
            query = query.Where(ii => ii.IsStocked == isStocked.Value);

        var items = await query
            .OrderBy(ii => ii.Location)
            .ThenBy(ii => ii.ProductId)
            .ToListAsync();

        return Ok(items.Select(MapToDto));
    }

    // GET /api/inventory/summary
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var summary = await _context.InventoryItems
            .GroupBy(ii => ii.Location)
            .Select(g => new InventorySummaryDto
            {
                Location = g.Key,
                TotalOnHand = g.Sum(ii => ii.OnHandStock),
                TotalAvailable = g.Sum(ii => ii.AvailableStock),
                TotalIncoming = g.Sum(ii => ii.IncomingStock),
                TotalCommitted = g.Sum(ii => ii.CommittedStock),
                ItemCount = g.Count()
            })
            .OrderBy(s => s.Location)
            .ToListAsync();

        return Ok(summary);
    }

    // GET /api/inventory/low-stock
    [HttpGet("low-stock")]
    public async Task<IActionResult> GetLowStock()
    {
        var items = await _context.InventoryItems
            .Include(ii => ii.Product)
            .Where(ii => ii.Location == "Cape Town" && ii.OnHandStock == 0)
            .OrderBy(ii => ii.ProductId)
            .ToListAsync();

        return Ok(items.Select(MapToDto));
    }

    // GET /api/inventory/{productId}
    [HttpGet("{productId:int}")]
    public async Task<IActionResult> GetByProduct(int productId)
    {
        var productExists = await _context.Products.AnyAsync(p => p.Id == productId);
        if (!productExists)
            return NotFound(new { message = $"Product {productId} not found." });

        var items = await _context.InventoryItems
            .Include(ii => ii.Product)
            .Where(ii => ii.ProductId == productId)
            .OrderBy(ii => ii.Location)
            .ToListAsync();

        return Ok(items.Select(MapToDto));
    }

    // PUT /api/inventory/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInventoryDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var item = await _context.InventoryItems
            .Include(ii => ii.Product)
            .FirstOrDefaultAsync(ii => ii.Id == id);

        if (item == null) return NotFound(new { message = $"Inventory item {id} not found." });

        item.OnHandStock = dto.OnHandStock;
        item.IncomingStock = dto.IncomingStock;
        item.CommittedStock = dto.CommittedStock;
        item.AvailableStock = dto.AvailableStock;
        item.IsStocked = dto.IsStocked;
        item.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(dto.SKU))
            item.SKU = dto.SKU;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(item));
    }

    // POST /api/inventory/bulk-update
    [HttpPost("bulk-update")]
    public async Task<IActionResult> BulkUpdate([FromBody] BulkUpdateInventoryDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var ids = dto.Items.Select(i => i.Id).ToList();
        var items = await _context.InventoryItems
            .Include(ii => ii.Product)
            .Where(ii => ids.Contains(ii.Id))
            .ToListAsync();

        var foundIds = items.Select(i => i.Id).ToHashSet();
        var missingIds = ids.Where(id => !foundIds.Contains(id)).ToList();
        if (missingIds.Any())
            return BadRequest(new { message = "Some inventory items not found.", missingIds });

        foreach (var update in dto.Items)
        {
            var item = items.First(i => i.Id == update.Id);
            item.OnHandStock = update.OnHandStock;
            item.IncomingStock = update.IncomingStock;
            item.CommittedStock = update.CommittedStock;
            item.AvailableStock = update.AvailableStock;
            item.IsStocked = update.IsStocked;
            item.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { updated = items.Count, items = items.Select(MapToDto) });
    }

    private static InventoryItemDto MapToDto(BDP.API.Models.InventoryItem ii) => new()
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
