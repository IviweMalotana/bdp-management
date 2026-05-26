using BDP.API.Data;
using BDP.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/me/recurring")]
[Authorize]
public class StorefrontRecurringOrdersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public StorefrontRecurringOrdersController(AppDbContext db, UserManager<ApplicationUser> users)
    {
        _db = db;
        _users = users;
    }

    private async Task<(ApplicationUser? user, Client? client, int clientId)> LoadApprovedB2BUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return (null, null, 0);

        var user = await _users.FindByIdAsync(userId);
        if (user == null) return (null, null, 0);

        if (user.B2BStatus != "Approved" || !user.B2BClientId.HasValue)
            return (user, null, 0);

        var client = await _db.Clients.FirstOrDefaultAsync(c => c.Id == user.B2BClientId.Value);
        return (user, client, client?.Id ?? 0);
    }

    private static object MapOrder(RecurringOrder r) => new
    {
        id = r.Id,
        name = r.Name,
        frequency = r.Frequency,
        frequencyDays = r.FrequencyDays,
        nextOrderDate = r.NextOrderDate,
        status = r.Status,
        contractStartDate = r.ContractStartDate,
        contractEndDate = r.ContractEndDate,
        createdAt = r.CreatedAt,
        notes = r.Notes,
        items = r.Items.Select(i => new
        {
            id = i.Id,
            productVariantId = i.ProductVariantId,
            variantName = i.ProductVariant != null
                ? $"{i.ProductVariant.Product?.Name ?? ""} {i.ProductVariant.Size} {i.ProductVariant.BottleColour}".Trim()
                : string.Empty,
            quantity = i.Quantity
        }).ToList()
    };

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var (user, client, clientId) = await LoadApprovedB2BUser();
        if (user == null) return Unauthorized();
        if (client == null) return StatusCode(403, new { message = "Approved B2B account required." });

        var orders = await _db.RecurringOrders
            .Include(r => r.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .Where(r => r.ClientId == clientId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return Ok(orders.Select(MapOrder));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var (user, client, clientId) = await LoadApprovedB2BUser();
        if (user == null) return Unauthorized();
        if (client == null) return StatusCode(403, new { message = "Approved B2B account required." });

        var order = await _db.RecurringOrders
            .Include(r => r.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .FirstOrDefaultAsync(r => r.Id == id && r.ClientId == clientId);

        if (order == null) return NotFound();
        return Ok(MapOrder(order));
    }

    public record RecurringOrderItemRequest(int ProductVariantId, int Quantity);
    public record CreateRecurringOrderRequest(
        string Name,
        string Frequency,
        int FrequencyDays,
        DateTime ContractStartDate,
        DateTime ContractEndDate,
        string? Notes,
        List<RecurringOrderItemRequest> Items
    );

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRecurringOrderRequest req)
    {
        var (user, client, clientId) = await LoadApprovedB2BUser();
        if (user == null) return Unauthorized();
        if (client == null) return StatusCode(403, new { message = "Approved B2B account required." });

        if (req.Items == null || req.Items.Count == 0)
            return BadRequest(new { message = "At least one item is required." });

        if (req.ContractEndDate <= req.ContractStartDate)
            return BadRequest(new { message = "Contract end date must be after start date." });

        // Validate all variants exist
        var variantIds = req.Items.Select(i => i.ProductVariantId).Distinct().ToList();
        var existingVariants = await _db.ProductVariants
            .Where(v => variantIds.Contains(v.Id))
            .Select(v => v.Id)
            .ToListAsync();

        var missing = variantIds.Except(existingVariants).ToList();
        if (missing.Any())
            return BadRequest(new { message = $"Product variant(s) not found: {string.Join(", ", missing)}" });

        var order = new RecurringOrder
        {
            ClientId = clientId,
            Name = req.Name,
            Frequency = req.Frequency,
            FrequencyDays = req.FrequencyDays,
            ContractStartDate = req.ContractStartDate,
            ContractEndDate = req.ContractEndDate,
            NextOrderDate = req.ContractStartDate,
            Status = RecurringOrderStatus.Active,
            Notes = req.Notes,
            Items = req.Items.Select(i => new RecurringOrderItem
            {
                ProductVariantId = i.ProductVariantId,
                Quantity = i.Quantity
            }).ToList()
        };

        _db.RecurringOrders.Add(order);
        await _db.SaveChangesAsync();

        // Reload with includes for response
        var created = await _db.RecurringOrders
            .Include(r => r.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .FirstAsync(r => r.Id == order.Id);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, MapOrder(created));
    }

    [HttpPatch("{id:int}/pause")]
    public async Task<IActionResult> Pause(int id)
    {
        var (user, client, clientId) = await LoadApprovedB2BUser();
        if (user == null) return Unauthorized();
        if (client == null) return StatusCode(403, new { message = "Approved B2B account required." });

        var order = await _db.RecurringOrders
            .Include(r => r.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .FirstOrDefaultAsync(r => r.Id == id && r.ClientId == clientId);

        if (order == null) return NotFound();
        if (order.Status != RecurringOrderStatus.Active)
            return BadRequest(new { message = "Only active orders can be paused." });

        order.Status = RecurringOrderStatus.Paused;
        await _db.SaveChangesAsync();
        return Ok(MapOrder(order));
    }

    [HttpPatch("{id:int}/resume")]
    public async Task<IActionResult> Resume(int id)
    {
        var (user, client, clientId) = await LoadApprovedB2BUser();
        if (user == null) return Unauthorized();
        if (client == null) return StatusCode(403, new { message = "Approved B2B account required." });

        var order = await _db.RecurringOrders
            .Include(r => r.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .FirstOrDefaultAsync(r => r.Id == id && r.ClientId == clientId);

        if (order == null) return NotFound();
        if (order.Status != RecurringOrderStatus.Paused)
            return BadRequest(new { message = "Only paused orders can be resumed." });

        order.Status = RecurringOrderStatus.Active;
        await _db.SaveChangesAsync();
        return Ok(MapOrder(order));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Cancel(int id)
    {
        var (user, client, clientId) = await LoadApprovedB2BUser();
        if (user == null) return Unauthorized();
        if (client == null) return StatusCode(403, new { message = "Approved B2B account required." });

        var order = await _db.RecurringOrders
            .FirstOrDefaultAsync(r => r.Id == id && r.ClientId == clientId);

        if (order == null) return NotFound();
        if (order.Status == RecurringOrderStatus.Cancelled)
            return BadRequest(new { message = "Order is already cancelled." });

        order.Status = RecurringOrderStatus.Cancelled;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
