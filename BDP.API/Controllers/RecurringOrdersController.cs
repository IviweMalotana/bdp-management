using BDP.API.Data;
using BDP.API.DTOs.RecurringOrders;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/recurring-orders")]
[Authorize]
public class RecurringOrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly RecurringOrderService _recurringService;

    public RecurringOrdersController(AppDbContext context, RecurringOrderService recurringService)
    {
        _context = context;
        _recurringService = recurringService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? clientId, [FromQuery] string? status)
    {
        var query = _context.RecurringOrders
            .Include(r => r.Client)
            .Include(r => r.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .Include(r => r.Items).ThenInclude(i => i.CustomisationOption)
            .AsQueryable();

        if (clientId.HasValue) query = query.Where(r => r.ClientId == clientId);
        if (!string.IsNullOrEmpty(status)) query = query.Where(r => r.Status == status);

        var orders = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return Ok(orders.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await _context.RecurringOrders
            .Include(r => r.Client)
            .Include(r => r.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .Include(r => r.Items).ThenInclude(i => i.CustomisationOption)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (order == null) return NotFound();
        return Ok(MapToDto(order));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRecurringOrderDto dto)
    {
        if (!await _context.Clients.AnyAsync(c => c.Id == dto.ClientId))
            return BadRequest("Client not found.");

        var order = new RecurringOrder
        {
            ClientId = dto.ClientId,
            Name = dto.Name,
            Frequency = dto.Frequency,
            FrequencyDays = dto.FrequencyDays,
            ContractStartDate = dto.ContractStartDate,
            ContractEndDate = dto.ContractEndDate,
            NextOrderDate = dto.NextOrderDate,
            Notes = dto.Notes,
            Status = RecurringOrderStatus.Active
        };

        foreach (var item in dto.Items)
        {
            if (!await _context.ProductVariants.AnyAsync(v => v.Id == item.ProductVariantId))
                return BadRequest($"ProductVariant {item.ProductVariantId} not found.");
            order.Items.Add(new RecurringOrderItem
            {
                ProductVariantId = item.ProductVariantId,
                CustomisationOptionId = item.CustomisationOptionId,
                Quantity = item.Quantity
            });
        }

        _context.RecurringOrders.Add(order);
        await _context.SaveChangesAsync();

        await _context.Entry(order).Reference(r => r.Client).LoadAsync();
        foreach (var item in order.Items)
        {
            await _context.Entry(item).Reference(i => i.ProductVariant).LoadAsync();
            await _context.Entry(item.ProductVariant).Reference(v => v.Product).LoadAsync();
        }

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, MapToDto(order));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateRecurringOrderDto dto)
    {
        var order = await _context.RecurringOrders
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (order == null) return NotFound();

        order.Name = dto.Name;
        order.Frequency = dto.Frequency;
        order.FrequencyDays = dto.FrequencyDays;
        order.ContractStartDate = dto.ContractStartDate;
        order.ContractEndDate = dto.ContractEndDate;
        order.NextOrderDate = dto.NextOrderDate;
        order.Notes = dto.Notes;

        _context.RecurringOrderItems.RemoveRange(order.Items);
        order.Items.Clear();

        foreach (var item in dto.Items)
            order.Items.Add(new RecurringOrderItem
            {
                ProductVariantId = item.ProductVariantId,
                CustomisationOptionId = item.CustomisationOptionId,
                Quantity = item.Quantity
            });

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id}/pause")]
    public async Task<IActionResult> Pause(int id)
    {
        var order = await _context.RecurringOrders.FindAsync(id);
        if (order == null) return NotFound();
        order.Status = RecurringOrderStatus.Paused;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id}/resume")]
    public async Task<IActionResult> Resume(int id)
    {
        var order = await _context.RecurringOrders.FindAsync(id);
        if (order == null) return NotFound();
        order.Status = RecurringOrderStatus.Active;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var order = await _context.RecurringOrders.FindAsync(id);
        if (order == null) return NotFound();
        order.Status = RecurringOrderStatus.Cancelled;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id}/trigger")]
    public async Task<IActionResult> Trigger(int id)
    {
        if (!await _context.RecurringOrders.AnyAsync(r => r.Id == id)) return NotFound();
        await _recurringService.ProcessDueOrdersAsync();
        return Ok(new { message = "Processing triggered." });
    }

    private static RecurringOrderDto MapToDto(RecurringOrder r) => new()
    {
        Id = r.Id,
        ClientId = r.ClientId,
        ClientName = r.Client?.CompanyName ?? string.Empty,
        Name = r.Name,
        Frequency = r.Frequency,
        FrequencyDays = r.FrequencyDays,
        ContractStartDate = r.ContractStartDate,
        ContractEndDate = r.ContractEndDate,
        NextOrderDate = r.NextOrderDate,
        Status = r.Status,
        Notes = r.Notes,
        CreatedAt = r.CreatedAt,
        Items = r.Items.Select(i => new RecurringOrderItemDto
        {
            Id = i.Id,
            ProductVariantId = i.ProductVariantId,
            VariantName = i.ProductVariant != null ? $"{i.ProductVariant.Size} {i.ProductVariant.BottleColour}".Trim() : string.Empty,
            ProductName = i.ProductVariant?.Product?.Name ?? string.Empty,
            CustomisationOptionId = i.CustomisationOptionId,
            CustomisationType = i.CustomisationOption?.Type,
            Quantity = i.Quantity
        }).ToList()
    };
}
