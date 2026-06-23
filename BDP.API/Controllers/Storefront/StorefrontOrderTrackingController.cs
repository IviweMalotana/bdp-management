using BDP.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/orders")]
public class StorefrontOrderTrackingController : ControllerBase
{
    private readonly AppDbContext _db;

    public StorefrontOrderTrackingController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Public order tracking — no auth required.
    /// GET /api/storefront/orders/track?ref={orderNumber}&amp;email={email}
    /// </summary>
    [HttpGet("track")]
    public async Task<IActionResult> TrackOrder(
        [FromQuery(Name = "ref")] string? orderNumber,
        [FromQuery] string? email)
    {
        if (string.IsNullOrWhiteSpace(orderNumber) || string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Order number and email are required." });

        var normalEmail = email.Trim().ToLowerInvariant();
        var normalRef   = orderNumber.Trim();

        // Find all user IDs that have the supplied email (case-insensitive)
        var matchingUserIds = await _db.Users
            .Where(u => u.NormalizedEmail == normalEmail.ToUpperInvariant())
            .Select(u => u.Id)
            .ToListAsync();

        var order = await _db.Orders
            .Include(o => o.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v.Product)
            .Where(o =>
                EF.Functions.ILike(o.OrderNumber, normalRef) &&
                (
                    (o.GuestEmail != null && EF.Functions.ILike(o.GuestEmail, normalEmail)) ||
                    (o.UserId != null && matchingUserIds.Contains(o.UserId))
                )
            )
            .FirstOrDefaultAsync();

        if (order == null)
            return NotFound(new { message = "Order not found. Check your order number and email." });

        // Parse shipping address JSON — extract only safe public fields
        string? recipientName = null;
        string? city = null;
        string? province = null;
        string? country = null;

        if (!string.IsNullOrWhiteSpace(order.ShippingAddressJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(order.ShippingAddressJson);
                var root = doc.RootElement;
                recipientName = TryGet(root, "recipientName");
                city          = TryGet(root, "city");
                province      = TryGet(root, "province");
                country       = TryGet(root, "country");
            }
            catch { /* ignore malformed JSON */ }
        }

        return Ok(new
        {
            orderNumber      = order.OrderNumber,
            status           = order.Status,
            fulfilmentStatus = order.FulfilmentStatus,
            orderDate        = order.CreatedAt,
            shippingServiceName = order.ShippingServiceName,
            trackingNumber   = order.TrackingNumber,
            trackingCarrier  = order.TrackingCarrier,
            estimatedDelivery = (DateTime?)null,
            shippingAddress  = new
            {
                recipientName,
                city,
                province,
                country,
            },
            items = order.Items.Select(i => new
            {
                productName = i.ProductVariant?.Product?.Name,
                variantSku  = i.ProductVariant?.SKU,
                quantity    = i.Quantity,
            }),
        });
    }

    private static string? TryGet(JsonElement root, string key)
    {
        // Try camelCase then PascalCase
        if (root.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String)
            return v.GetString();
        var pascal = char.ToUpperInvariant(key[0]) + key[1..];
        if (root.TryGetProperty(pascal, out var v2) && v2.ValueKind == JsonValueKind.String)
            return v2.GetString();
        return null;
    }
}
