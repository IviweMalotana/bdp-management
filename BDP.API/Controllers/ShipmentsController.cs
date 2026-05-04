using BDP.API.Data;
using BDP.API.DTOs.Shipments;
using BDP.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ShipmentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ShipmentsController(AppDbContext context) => _context = context;

    // GET /api/shipments
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var shipments = await _context.Shipments
            .Include(sh => sh.Supplier)
            .Include(sh => sh.Items)
            .OrderByDescending(sh => sh.OrderDate)
            .ToListAsync();

        return Ok(shipments.Select(MapToDto));
    }

    // GET /api/shipments/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var shipment = await _context.Shipments
            .Include(sh => sh.Supplier)
            .Include(sh => sh.Items)
            .FirstOrDefaultAsync(sh => sh.Id == id);

        if (shipment == null) return NotFound(new { message = $"Shipment {id} not found." });
        return Ok(MapToDetailDto(shipment));
    }

    // POST /api/shipments
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] ShipmentCreateDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (!dto.Items.Any()) return BadRequest(new { message = "Shipment must contain at least one item." });

        var supplier = await _context.Suppliers.FindAsync(dto.SupplierId);
        if (supplier == null) return BadRequest(new { message = "Supplier not found." });

        var productIds = dto.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        var missingIds = productIds.Except(products.Keys).ToList();
        if (missingIds.Any())
            return BadRequest(new { message = $"Products not found: {string.Join(", ", missingIds)}" });

        var reference = await GenerateReferenceAsync();

        var shipment = new Shipment
        {
            Reference = reference,
            SupplierId = dto.SupplierId,
            Status = ShipmentStatus.Ordered,
            OrderDate = dto.OrderDate,
            EstimatedArrival = dto.EstimatedArrival,
            SeaFreightCostZAR = dto.SeaFreightCostZAR,
            CustomsDutyZAR = dto.CustomsDutyZAR,
            DestinationAddress = dto.DestinationAddress,
            CustomerName = dto.CustomerName,
            CustomerEmail = dto.CustomerEmail,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Shipments.Add(shipment);
        await _context.SaveChangesAsync();

        foreach (var item in dto.Items)
        {
            var product = products[item.ProductId];
            _context.ShipmentItems.Add(new ShipmentItem
            {
                ShipmentId = shipment.Id,
                ProductId = item.ProductId,
                ProductName = product.Name,
                SKU = string.Empty,
                Quantity = item.Quantity,
                CostPerUnitZAR = item.CostPerUnitZAR,
                TotalCostZAR = Math.Round(item.Quantity * item.CostPerUnitZAR, 4),
            });
        }

        await _context.SaveChangesAsync();

        var created = await _context.Shipments
            .Include(sh => sh.Supplier)
            .Include(sh => sh.Items)
            .FirstAsync(sh => sh.Id == shipment.Id);

        return CreatedAtAction(nameof(GetById), new { id = shipment.Id }, MapToDetailDto(created));
    }

    // PUT /api/shipments/{id}
    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] ShipmentUpdateDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var shipment = await _context.Shipments.FindAsync(id);
        if (shipment == null) return NotFound(new { message = $"Shipment {id} not found." });

        if (dto.Status != null)
        {
            if (!Enum.TryParse<ShipmentStatus>(dto.Status, true, out var status))
                return BadRequest(new { message = $"Invalid status '{dto.Status}'." });
            shipment.Status = status;
        }

        shipment.EstimatedArrival = dto.EstimatedArrival;
        shipment.ActualArrival = dto.ActualArrival;
        shipment.SeaFreightCostZAR = dto.SeaFreightCostZAR;
        shipment.CustomsDutyZAR = dto.CustomsDutyZAR;
        shipment.DestinationAddress = dto.DestinationAddress;
        shipment.CustomerName = dto.CustomerName;
        shipment.CustomerEmail = dto.CustomerEmail;
        shipment.Notes = dto.Notes;

        await _context.SaveChangesAsync();

        var updated = await _context.Shipments
            .Include(sh => sh.Supplier)
            .Include(sh => sh.Items)
            .FirstAsync(sh => sh.Id == id);

        return Ok(MapToDetailDto(updated));
    }

    // PUT /api/shipments/{id}/status
    [HttpPut("{id:int}/status")]
    [Authorize]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] ShipmentStatusDto dto)
    {
        var shipment = await _context.Shipments
            .Include(sh => sh.Supplier)
            .Include(sh => sh.Items)
            .FirstOrDefaultAsync(sh => sh.Id == id);

        if (shipment == null) return NotFound(new { message = $"Shipment {id} not found." });

        if (!Enum.TryParse<ShipmentStatus>(dto.Status, true, out var status))
            return BadRequest(new { message = $"Invalid status '{dto.Status}'. Valid values: {string.Join(", ", Enum.GetNames<ShipmentStatus>())}" });

        shipment.Status = status;
        if (status == ShipmentStatus.Delivered && shipment.ActualArrival == null)
            shipment.ActualArrival = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapToDetailDto(shipment));
    }

    // DELETE /api/shipments/{id}
    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var shipment = await _context.Shipments
            .Include(sh => sh.Items)
            .FirstOrDefaultAsync(sh => sh.Id == id);

        if (shipment == null) return NotFound(new { message = $"Shipment {id} not found." });

        if (shipment.Status != ShipmentStatus.Ordered && shipment.Status != ShipmentStatus.Cancelled)
            return Conflict(new { message = $"Cannot delete shipment '{shipment.Reference}': only Ordered or Cancelled shipments can be deleted." });

        _context.ShipmentItems.RemoveRange(shipment.Items);
        _context.Shipments.Remove(shipment);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private async Task<string> GenerateReferenceAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"SHP-{year}-";
        var count = await _context.Shipments.CountAsync(sh => sh.Reference.StartsWith(prefix));
        return $"{prefix}{(count + 1):000}";
    }

    // ── Mappers ────────────────────────────────────────────────────────────

    private static ShipmentDto MapToDto(Shipment sh)
    {
        var itemsTotal = sh.Items?.Sum(i => i.TotalCostZAR) ?? 0m;
        var ddp = sh.SeaFreightCostZAR + sh.CustomsDutyZAR;
        return new ShipmentDto
        {
            Id = sh.Id,
            Reference = sh.Reference,
            SupplierId = sh.SupplierId,
            SupplierName = sh.Supplier?.Name ?? string.Empty,
            Status = sh.Status.ToString(),
            OrderDate = sh.OrderDate,
            EstimatedArrival = sh.EstimatedArrival,
            ActualArrival = sh.ActualArrival,
            OriginCountry = "China",
            SeaFreightCostZAR = sh.SeaFreightCostZAR,
            CustomsDutyZAR = sh.CustomsDutyZAR,
            DdpTotalZAR = ddp,
            TotalCostZAR = ddp + itemsTotal,
            DestinationAddress = sh.DestinationAddress,
            CustomerName = sh.CustomerName,
            CustomerEmail = sh.CustomerEmail,
            Notes = sh.Notes,
            ItemCount = sh.Items?.Count ?? 0,
            CreatedAt = sh.CreatedAt,
        };
    }

    private static ShipmentDetailDto MapToDetailDto(Shipment sh)
    {
        var itemsTotal = sh.Items?.Sum(i => i.TotalCostZAR) ?? 0m;
        var ddp = sh.SeaFreightCostZAR + sh.CustomsDutyZAR;
        return new ShipmentDetailDto
        {
            Id = sh.Id,
            Reference = sh.Reference,
            SupplierId = sh.SupplierId,
            SupplierName = sh.Supplier?.Name ?? string.Empty,
            Status = sh.Status.ToString(),
            OrderDate = sh.OrderDate,
            EstimatedArrival = sh.EstimatedArrival,
            ActualArrival = sh.ActualArrival,
            OriginCountry = "China",
            SeaFreightCostZAR = sh.SeaFreightCostZAR,
            CustomsDutyZAR = sh.CustomsDutyZAR,
            DdpTotalZAR = ddp,
            TotalCostZAR = ddp + itemsTotal,
            DestinationAddress = sh.DestinationAddress,
            CustomerName = sh.CustomerName,
            CustomerEmail = sh.CustomerEmail,
            Notes = sh.Notes,
            ItemCount = sh.Items?.Count ?? 0,
            CreatedAt = sh.CreatedAt,
            Items = sh.Items?.Select(i => new ShipmentItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                SKU = i.SKU,
                Quantity = i.Quantity,
                CostPerUnitZAR = i.CostPerUnitZAR,
                TotalCostZAR = i.TotalCostZAR,
            }).ToList() ?? new(),
        };
    }
}
