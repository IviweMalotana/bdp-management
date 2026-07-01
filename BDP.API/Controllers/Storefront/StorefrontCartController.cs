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
        var options = await _db.CustomisationOptions.ToListAsync();
        var rate = await _pricing.GetLiveExchangeRate();
        return SerialiseCart(cart, settings, options, rate);
    }

    private object SerialiseCart(Cart cart, List<CustomisationSetting> settings,
        List<CustomisationOption> options, decimal rate)
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

                // A line may carry several add-ons (printing + colour). Sum them all.
                var ids = PricingService.ParseCustomisationOptionIds(item.CustomisationOptionIdsJson, item.CustomisationOptionId);
                var opts = ids.Select(id => options.FirstOrDefault(o => o.Id == id)).Where(o => o != null).Select(o => o!).ToList();
                var breakdown = PricingService.ComputeCustomisationBreakdown(opts, settings, item.Quantity, rate);
                var customisationCost = Math.Round(breakdown.Sum(b => b.CostZAR), 2);

                var imageUrl = item.ProductVariant.Product?.Images
                    .OrderBy(i => i.SortOrder).FirstOrDefault()?.Url;
                return new
                {
                    item.Id,
                    item.ProductVariantId,
                    productName = item.ProductVariant.Product?.Name,
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
                    customisationOptionIds = ids,
                    customisations = breakdown.Select(b => new { type = b.Type, costZAR = b.CostZAR }),
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

    // Canonical sorted-CSV key for a line's customisation set (for merge identity).
    private static string CustomisationKey(string? idsJson, int? legacySingle)
        => string.Join(",", PricingService.ParseCustomisationOptionIds(idsJson, legacySingle).OrderBy(x => x));

    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var userId = GetUserId();
        var sessionToken = Request.Headers["X-Cart-Token"].FirstOrDefault();

        var cart = ResolveCart(userId, sessionToken) ?? CreateCart(userId, sessionToken);
        await _db.SaveChangesAsync();

        return Ok(await SerialiseCartAsync(cart));
    }

    // CustomisationOptionIds supports multiple add-ons per line (printing + colour);
    // CustomisationOptionId is kept for backward compatibility (older clients).
    public record AddItemRequest(int VariantId, int Quantity, int? CustomisationOptionId, int[]? CustomisationOptionIds, string? CustomisationNotes);

    [HttpPost("items")]
    public async Task<IActionResult> AddItem([FromBody] AddItemRequest req)
    {
        var userId = GetUserId();
        var sessionToken = Request.Headers["X-Cart-Token"].FirstOrDefault();

        var cart = ResolveCart(userId, sessionToken) ?? CreateCart(userId, sessionToken);

        // Canonical, de-duplicated, sorted set of customisation option IDs for this line.
        var ids = (req.CustomisationOptionIds != null && req.CustomisationOptionIds.Length > 0)
            ? req.CustomisationOptionIds.Distinct().OrderBy(x => x).ToList()
            : (req.CustomisationOptionId.HasValue ? new List<int> { req.CustomisationOptionId.Value } : new List<int>());
        var idsJson = ids.Count > 0 ? System.Text.Json.JsonSerializer.Serialize(ids) : null;
        var key = string.Join(",", ids);

        var existing = cart.Items.FirstOrDefault(i =>
            i.ProductVariantId == req.VariantId &&
            CustomisationKey(i.CustomisationOptionIdsJson, i.CustomisationOptionId) == key);
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
                CustomisationOptionId = ids.Count > 0 ? ids[0] : (int?)null,
                CustomisationOptionIdsJson = idsJson,
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
            var existing = userCart.Items.FirstOrDefault(i =>
                i.ProductVariantId == item.ProductVariantId &&
                CustomisationKey(i.CustomisationOptionIdsJson, i.CustomisationOptionId)
                    == CustomisationKey(item.CustomisationOptionIdsJson, item.CustomisationOptionId));
            if (existing != null)
                existing.Quantity += item.Quantity;
            else
                userCart.Items.Add(new CartItem
                {
                    ProductVariantId = item.ProductVariantId,
                    Quantity = item.Quantity,
                    CustomisationOptionId = item.CustomisationOptionId,
                    CustomisationOptionIdsJson = item.CustomisationOptionIdsJson,
                    CustomisationNotes = item.CustomisationNotes
                });
        }

        _db.Carts.Remove(guestCart);
        userCart.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { merged = true });
    }
}
