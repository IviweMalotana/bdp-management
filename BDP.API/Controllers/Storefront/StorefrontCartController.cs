using BDP.API.Data;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/cart")]
public class StorefrontCartController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PricingService _pricing;

    public StorefrontCartController(AppDbContext db, PricingService pricing)
    {
        _db = db;
        _pricing = pricing;
    }

    private string? GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

    private Cart? ResolveCart(string? userId, string? sessionToken)
    {
        if (!string.IsNullOrEmpty(userId))
            return _db.Carts
                .Include(c => c.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.PricingTiers)
                .Include(c => c.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product).ThenInclude(p => p.Images)
                .Include(c => c.Items).ThenInclude(i => i.CustomisationOption)
                .FirstOrDefault(c => c.UserId == userId && c.ExpiresAt > DateTime.UtcNow);

        if (!string.IsNullOrEmpty(sessionToken))
            return _db.Carts
                .Include(c => c.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.PricingTiers)
                .Include(c => c.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product).ThenInclude(p => p.Images)
                .Include(c => c.Items).ThenInclude(i => i.CustomisationOption)
                .FirstOrDefault(c => c.SessionToken == sessionToken && c.UserId == null && c.ExpiresAt > DateTime.UtcNow);

        return null;
    }

    private Cart CreateCart(string? userId, string? sessionToken)
    {
        var cart = new Cart
        {
            UserId = userId,
            SessionToken = sessionToken ?? Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        _db.Carts.Add(cart);
        return cart;
    }

    // Loads the customisation settings + live rate, then serialises the cart so the
    // line totals it returns already include the customisation surcharge (the cart and
    // checkout sum lineTotalZAR — omitting it here under-charged the displayed total
    // while the order added it back, so buyers saw less than they were charged).
    private async Task<object> SerialiseCartAsync(Cart cart)
    {
        var settings = await _db.CustomisationSettings.ToListAsync();
        var rate = await _pricing.GetLiveExchangeRate();
        return SerialiseCart(cart, settings, rate);
    }

    private object SerialiseCart(Cart cart, List<CustomisationSetting> settings, decimal rate)
    {
        return new
        {
            cart.Id,
            cart.SessionToken,
            items = cart.Items.Select(item =>
            {
                var tiers = item.ProductVariant.PricingTiers.OrderBy(t => t.Quantity).ToList();
                // Interpolated unit price — matches the quote/PDP/checkout for any qty.
                var unitPrice = PricingService.InterpolateTierPrice(tiers, item.Quantity);
                var bottleTotal = Math.Round(unitPrice * item.Quantity, 2);

                var setting = item.CustomisationOption != null
                    ? settings.FirstOrDefault(s => s.Type == item.CustomisationOption.Type)
                    : null;
                var customisationCost = PricingService.ComputeCustomisationCostZAR(
                    item.CustomisationOption, setting, item.Quantity, rate);

                var imageUrl = item.ProductVariant.Product?.Images
                    .OrderBy(i => i.SortOrder).FirstOrDefault()?.Url;
                return new
                {
                    item.Id,
                    item.ProductVariantId,
                    variant = new
                    {
                        item.ProductVariant.SKU,
                        item.ProductVariant.Size,
                        item.ProductVariant.BottleColour,
                        item.ProductVariant.Texture,
                        imageUrl
                    },
                    item.Quantity,
                    item.CustomisationOptionId,
                    item.CustomisationNotes,
                    unitPriceZAR = unitPrice,
                    customisationCostZAR = customisationCost,
                    lineTotalZAR = bottleTotal + customisationCost,
                    weightKg = (double?)(item.ProductVariant.WeightKg > 0
                        ? item.ProductVariant.WeightKg
                        : item.ProductVariant.Product?.WeightKg)
                };
            })
        };
    }

    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var userId = GetUserId();
        var sessionToken = Request.Headers["X-Cart-Token"].FirstOrDefault();

        var cart = ResolveCart(userId, sessionToken) ?? CreateCart(userId, sessionToken);
        await _db.SaveChangesAsync();

        return Ok(await SerialiseCartAsync(cart));
    }

    public record AddItemRequest(int VariantId, int Quantity, int? CustomisationOptionId, string? CustomisationNotes);

    [HttpPost("items")]
    public async Task<IActionResult> AddItem([FromBody] AddItemRequest req)
    {
        var userId = GetUserId();
        var sessionToken = Request.Headers["X-Cart-Token"].FirstOrDefault();

        var cart = ResolveCart(userId, sessionToken) ?? CreateCart(userId, sessionToken);

        var existing = cart.Items.FirstOrDefault(i => i.ProductVariantId == req.VariantId && i.CustomisationOptionId == req.CustomisationOptionId);
        if (existing != null)
        {
            existing.Quantity += req.Quantity;
        }
        else
        {
            cart.Items.Add(new CartItem
            {
                ProductVariantId = req.VariantId,
                Quantity = req.Quantity,
                CustomisationOptionId = req.CustomisationOptionId,
                CustomisationNotes = req.CustomisationNotes
            });
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // reload with pricing data
        var fresh = ResolveCart(userId, cart.SessionToken)!;
        return Ok(await SerialiseCartAsync(fresh));
    }

    public record UpdateQuantityRequest(int Quantity);

    [HttpPatch("items/{id:int}")]
    public async Task<IActionResult> UpdateItem(int id, [FromBody] UpdateQuantityRequest req)
    {
        var userId = GetUserId();
        var sessionToken = Request.Headers["X-Cart-Token"].FirstOrDefault();

        var cart = ResolveCart(userId, sessionToken);
        if (cart == null) return NotFound();

        var item = cart.Items.FirstOrDefault(i => i.Id == id);
        if (item == null) return NotFound();

        if (req.Quantity <= 0)
            cart.Items.Remove(item);
        else
            item.Quantity = req.Quantity;

        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var fresh = ResolveCart(userId, cart.SessionToken)!;
        return Ok(await SerialiseCartAsync(fresh));
    }

    [HttpDelete("items/{id:int}")]
    public async Task<IActionResult> RemoveItem(int id)
    {
        var userId = GetUserId();
        var sessionToken = Request.Headers["X-Cart-Token"].FirstOrDefault();

        var cart = ResolveCart(userId, sessionToken);
        if (cart == null) return NotFound();

        var item = cart.Items.FirstOrDefault(i => i.Id == id);
        if (item == null) return NotFound();

        cart.Items.Remove(item);
        cart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var fresh = ResolveCart(userId, cart.SessionToken)!;
        return Ok(await SerialiseCartAsync(fresh));
    }

    public record MergeRequest(string GuestSessionToken);

    [HttpPost("merge")]
    public async Task<IActionResult> Merge([FromBody] MergeRequest req)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var guestCart = await _db.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.SessionToken == req.GuestSessionToken && c.UserId == null);

        if (guestCart == null) return Ok(new { merged = false });

        var userCart = await _db.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.UserId == userId && c.ExpiresAt > DateTime.UtcNow);

        if (userCart == null)
        {
            guestCart.UserId = userId;
            await _db.SaveChangesAsync();
            return Ok(new { merged = true });
        }

        foreach (var item in guestCart.Items)
        {
            var existing = userCart.Items.FirstOrDefault(i => i.ProductVariantId == item.ProductVariantId && i.CustomisationOptionId == item.CustomisationOptionId);
            if (existing != null)
                existing.Quantity += item.Quantity;
            else
                userCart.Items.Add(new CartItem
                {
                    ProductVariantId = item.ProductVariantId,
                    Quantity = item.Quantity,
                    CustomisationOptionId = item.CustomisationOptionId,
                    CustomisationNotes = item.CustomisationNotes
                });
        }

        _db.Carts.Remove(guestCart);
        userCart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { merged = true });
    }
}
