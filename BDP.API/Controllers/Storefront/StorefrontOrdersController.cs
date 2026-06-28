using BDP.API.Data;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/me/orders")]
[Authorize]
public class StorefrontOrdersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly YunExpressService _yunExpress;

    public StorefrontOrdersController(AppDbContext db, YunExpressService yunExpress)
    {
        _db = db;
        _yunExpress = yunExpress;
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);

        var orders = await _db.Orders
            .Include(o => o.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .Where(o => o.UserId == userId || o.GuestEmail == email)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return Ok(orders.Select(o => new
        {
            o.Id,
            o.OrderNumber,
            o.Status,
            o.FulfilmentStatus,
            o.Channel,
            o.TotalZAR,
            o.IsPaid,
            o.CreatedAt,
            itemCount = o.Items.Count
        }));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetOrder(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);

        var order = await _db.Orders
            .Include(o => o.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .Include(o => o.Items).ThenInclude(i => i.CustomisationOption)
            .FirstOrDefaultAsync(o => o.Id == id && (o.UserId == userId || o.GuestEmail == email));

        if (order == null) return NotFound();

        return Ok(new
        {
            order.Id,
            order.OrderNumber,
            order.Status,
            order.FulfilmentStatus,
            order.Channel,
            order.SubtotalZAR,
            order.ShippingCostZAR,
            order.TotalZAR,
            order.IsPaid,
            order.PaidAt,
            order.PaystackPaymentReference,
            order.ShippingAddressJson,
            order.ShippingServiceCode,
            order.ShippingServiceName,
            order.TrackingNumber,
            order.TrackingCarrier,
            order.ShippedDate,
            order.DeliveredDate,
            order.CreatedAt,
            items = order.Items.Select(i => new
            {
                i.Id,
                i.ProductVariantId,
                productName = i.ProductVariant.Product.Name,
                variantSku = i.ProductVariant.SKU,
                i.Quantity,
                i.UnitPriceZAR,
                i.LineTotal,
                i.CustomisationCostZAR,
                customisationType = i.CustomisationOption != null ? i.CustomisationOption.Type : null
            })
        });
    }

    [HttpGet("{id:int}/tracking")]
    public async Task<IActionResult> GetTracking(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email  = User.FindFirstValue(ClaimTypes.Email);

        var order = await _db.Orders
            .FirstOrDefaultAsync(o => o.Id == id && (o.UserId == userId || o.GuestEmail == email));

        if (order == null) return NotFound();

        if (string.IsNullOrWhiteSpace(order.TrackingNumber))
            return Ok(new { trackingNumber = (string?)null, carrier = (string?)null, events = Array.Empty<object>() });

        var events = await _yunExpress.GetTrackingAsync(order.TrackingNumber);

        return Ok(new
        {
            trackingNumber = order.TrackingNumber,
            carrier        = order.TrackingCarrier ?? "YunExpress",
            events         = events.Select(e => new { e.Time, e.Description, e.Location })
        });
    }
}
