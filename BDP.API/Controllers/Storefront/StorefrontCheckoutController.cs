using BDP.API.Data;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/checkout")]
public class StorefrontCheckoutController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ShippingCalculatorService _shipping;
    private readonly PaystackService _paystack;
    private readonly IConfiguration _config;
    private readonly PricingService _pricing;
    private readonly YunExpressService _yunExpress;

    public StorefrontCheckoutController(
        AppDbContext db,
        ShippingCalculatorService shipping,
        PaystackService paystack,
        IConfiguration config,
        PricingService pricing,
        YunExpressService yunExpress)
    {
        _db = db;
        _shipping = shipping;
        _paystack = paystack;
        _config = config;
        _pricing = pricing;
        _yunExpress = yunExpress;
    }

    public record ShippingQuoteAddress(string City, string Province, string PostalCode);
    public record ShippingQuoteRequest(int CartId, ShippingQuoteAddress Address);

    [HttpPost("shipping-quote")]
    public async Task<IActionResult> ShippingQuote([FromBody] ShippingQuoteRequest req)
    {
        var cart = await _db.Carts
            .Include(c => c.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .FirstOrDefaultAsync(c => c.Id == req.CartId);

        if (cart == null) return NotFound("Cart not found.");

        decimal totalWeight = 0;
        decimal totalVolume = 0;
        int totalQty = 0;

        foreach (var item in cart.Items)
        {
            var v = item.ProductVariant;
            var product = v.Product;
            var wKg = v.WeightKg > 0 ? v.WeightKg : product.WeightKg;
            var l   = v.LengthCm > 0 ? v.LengthCm : product.LengthCm;
            var w   = v.WidthCm  > 0 ? v.WidthCm  : product.WidthCm;
            var h   = v.HeightCm > 0 ? v.HeightCm : product.HeightCm;
            totalWeight += wKg * item.Quantity;
            totalVolume += ShippingCalculator.ComputeVolumeCBM(l, w, h) * item.Quantity;
            totalQty += item.Quantity;
        }

        var shippingZAR = await _shipping.CalculateAsync(totalWeight, totalVolume, totalQty);

        return Ok(new { shippingZAR, estimatedDays = "28-42" });
    }

    public record CheckoutAddress(string RecipientName, string Line1, string? Line2, string City, string Province, string PostalCode, string Country = "ZA", string? Phone = null);
    public record InitiateRequest(
        int CartId,
        CheckoutAddress ShippingAddress,
        CheckoutAddress BillingAddress,
        string? GuestEmail,
        string PaymentMethod = "Paystack_Card",
        string? ShippingServiceCode = null,
        string? ShippingServiceName = null,
        decimal? ShippingPriceZAR = null
    );

    [HttpPost("initiate")]
    public async Task<IActionResult> Initiate([FromBody] InitiateRequest req)
    {
        var cart = await _db.Carts
            .Include(c => c.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.PricingTiers)
            .Include(c => c.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .Include(c => c.Items).ThenInclude(i => i.Artworks)
            .Include(c => c.Items).ThenInclude(i => i.CustomisationOption)
            .FirstOrDefaultAsync(c => c.Id == req.CartId);

        if (cart == null) return NotFound("Cart not found.");
        if (!cart.Items.Any()) return BadRequest("Cart is empty.");

        // Pre-load customisation settings for pricing
        var customSettings = await _db.CustomisationSettings.ToListAsync();
        var rate = await _pricing.GetLiveExchangeRate();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = req.GuestEmail ?? User.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

        if (string.IsNullOrWhiteSpace(email))
            return BadRequest("Email is required for checkout.");

        // Server-side reprice
        decimal subtotal = 0;
        var orderItems = new List<OrderItem>();

        foreach (var item in cart.Items)
        {
            var tiers = item.ProductVariant.PricingTiers.OrderBy(t => t.Quantity).ToList();
            if (!tiers.Any()) return BadRequest($"Variant {item.ProductVariantId} has no pricing.");

            var moq = tiers.First().Quantity;
            if (item.Quantity < moq) return BadRequest($"Quantity {item.Quantity} is below MOQ of {moq} for variant {item.ProductVariantId}.");

            // Keep a representative tier for the OrderItem FK, but price via the SAME
            // interpolation the storefront quote uses so charged == shown for any qty
            // (the old floor-tier price diverged from the cart for non-anchor quantities).
            var tier = tiers.LastOrDefault(t => t.Quantity <= item.Quantity) ?? tiers.First();
            var unitPrice = PricingService.InterpolateTierPrice(tiers, item.Quantity);
            var lineTotal = Math.Round(unitPrice * item.Quantity, 2);
            subtotal += lineTotal;

            // Compute customisation cost server-side (same logic as StorefrontPricingController)
            decimal customisationCost = 0;
            if (item.CustomisationOption != null)
            {
                var setting = customSettings.FirstOrDefault(s => s.Type == item.CustomisationOption.Type);
                if (setting != null)
                {
                    var customMoq = item.CustomisationOption.MinimumQuantity ?? setting.DefaultMinimumQuantity;
                    if (item.Quantity >= customMoq)
                    {
                        decimal customUnitPrice;
                        if (setting.Type == "ColourChange")
                        {
                            customUnitPrice = setting.PricePerUnitZAR;
                        }
                        else
                        {
                            var costZAR = Math.Round(setting.CostPerUnitCNY * rate, 4);
                            var markup = PricingService.InterpolateMarkup(item.Quantity);
                            customUnitPrice = Math.Round(costZAR * (1 + markup / 100m), 4);
                        }
                        customisationCost = Math.Round(customUnitPrice * item.Quantity, 2);
                    }
                }
            }
            subtotal += customisationCost;

            orderItems.Add(new OrderItem
            {
                ProductVariantId = item.ProductVariantId,
                PricingTierId = tier.Id,
                CustomisationOptionId = item.CustomisationOptionId,
                Quantity = item.Quantity,
                UnitPriceZAR = unitPrice,
                LineTotal = lineTotal,
                CustomisationCostZAR = customisationCost
            });
        }

        var units = cart.Items.Sum(i => i.Quantity);
        var totalWeight = cart.Items.Sum(i => {
            var v = i.ProductVariant; var p = v.Product;
            return (v.WeightKg > 0 ? v.WeightKg : p.WeightKg) * i.Quantity;
        });

        // Authoritative shipping: re-quote the SAME source the customer saw in step 2
        // (YunExpress rates + configured markup) and charge the service they selected.
        // We never fall back to the CBM ShippingCalculator here — that produced a wildly
        // different (much higher) figure the customer never agreed to, which charged
        // buyers far above the review total. See ResolveSelectedShippingZAR.
        var shippingZAR = await ResolveSelectedShippingZAR(
            req.ShippingAddress.Country, units, req.ShippingServiceCode, req.ShippingPriceZAR);

        // What the shipment actually costs us: re-quote the SAME service at the real
        // product weight (totalWeight). The customer is charged at the inflated billing
        // weight; this gap is shipping margin. 0 if real weight is unknown/zero.
        var actualShippingZAR = await ComputeActualShippingCostZAR(
            req.ShippingAddress.Country, totalWeight, req.ShippingServiceCode);

        var totalZAR = subtotal + shippingZAR;

        var orderNumber = $"SF-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";
        var order = new Order
        {
            OrderNumber = orderNumber,
            Status = OrderStatus.Placed,
            UserId = userId,
            GuestEmail = string.IsNullOrEmpty(userId) ? email : null,
            Channel = "Storefront_B2C",
            FulfilmentStatus = "Placed",
            SubtotalZAR = subtotal,
            ShippingCostZAR = shippingZAR,
            ActualShippingCostZAR = actualShippingZAR,
            TotalZAR = totalZAR,
            IsPaid = false,
            PaymentMethod = req.PaymentMethod,
            ShippingAddressJson = JsonSerializer.Serialize(req.ShippingAddress),
            BillingAddressJson = JsonSerializer.Serialize(req.BillingAddress),
            ShippingServiceCode = req.ShippingServiceCode,
            ShippingServiceName = req.ShippingServiceName,
            Items = orderItems
        };

        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        // Copy artwork from cart items to the newly-created order items
        var cartItemsList = cart.Items.ToList();
        for (int i = 0; i < cartItemsList.Count; i++)
        {
            var cartItem = cartItemsList[i];
            if (!cartItem.Artworks.Any()) continue;

            var orderItem = order.Items[i];
            foreach (var a in cartItem.Artworks)
            {
                _db.OrderItemArtworks.Add(new OrderItemArtwork
                {
                    OrderItemId = orderItem.Id,
                    FileName = a.FileName,
                    FileUrl = a.FileUrl,
                    Notes = a.Notes,
                    UploadedAt = a.UploadedAt
                });
            }
        }
        if (cartItemsList.Any(ci => ci.Artworks.Any()))
            await _db.SaveChangesAsync();

        var (reference, authorizationUrl, accessCode) = await _paystack.InitializeTransactionAsync(email, totalZAR, order.Id);
        order.PaystackPaymentReference = reference;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            orderId = order.Id,
            paystackReference = reference,
            paystackAuthorizationUrl = authorizationUrl,
            paystackPublicKey = _config["Paystack:PublicKey"],
            amountZAR = totalZAR
        });
    }

    // Resolve the shipping price authoritatively from the SAME source shown to the
    // customer in step 2: YunExpress live rates for this destination/billing-weight,
    // plus the configured retail markup, keyed by the service the customer selected.
    // This guarantees the charged shipping equals one of the prices we displayed.
    // If the carrier can't be reached we charge exactly what we showed the customer
    // (the client-supplied price) — never the divergent CBM calculator.
    private async Task<decimal> ResolveSelectedShippingZAR(
        string country, int units, string? serviceCode, decimal? clientShownPrice)
    {
        try
        {
            // Same billing-weight basis the options endpoint uses (250 g / unit).
            var weightGrams = Math.Max(1, units * (int)Math.Round(ShippingCalculator.FixedUnitWeightKg * 1000));
            var rates = await _yunExpress.GetRatesAsync(country, weightGrams);

            decimal markupPct = 40m;
            try
            {
                var settings = await _db.ShippingSettings.FindAsync(1);
                markupPct = settings?.ShippingMarkupPercent ?? 40m;
            }
            catch { /* settings/migration missing — use default 40% */ }

            foreach (var r in rates)
                r.PriceZAR = Math.Round(r.PriceZAR * (1 + markupPct / 100m), 2);

            // Prefer the exact service the customer chose (authoritative, tamper-proof).
            if (!string.IsNullOrWhiteSpace(serviceCode))
            {
                var match = rates.FirstOrDefault(r => r.Code == serviceCode);
                if (match != null) return match.PriceZAR;
            }
            // No code, or it no longer quotes: use the price we showed, else cheapest quote.
            if (clientShownPrice is > 0) return clientShownPrice.Value;
            if (rates.Count > 0) return rates.OrderBy(r => r.PriceZAR).First().PriceZAR;
        }
        catch { /* carrier unreachable — fall through to the shown price */ }

        // Last resort: charge exactly what we showed the customer; never the CBM calculator.
        return clientShownPrice is > 0 ? clientShownPrice.Value : 0m;
    }

    // Our true shipping cost: the SAME service code re-quoted at the real product
    // weight. The customer is charged at the inflated billing weight; the difference
    // is shipping margin. Returns 0 when the real weight is unknown or the carrier
    // can't be reached, so a failure here never blocks checkout.
    private async Task<decimal> ComputeActualShippingCostZAR(string country, decimal realWeightKg, string? serviceCode)
    {
        if (realWeightKg <= 0) return 0m;

        try
        {
            var grams = (int)Math.Max(1, Math.Round(realWeightKg * 1000));
            var rates = await _yunExpress.GetRatesAsync(country, grams);
            if (rates.Count == 0) return 0m;

            // Prefer the exact service the customer chose; otherwise the cheapest quote.
            var match = !string.IsNullOrWhiteSpace(serviceCode)
                ? rates.FirstOrDefault(r => r.Code == serviceCode)
                : null;
            return (match ?? rates.OrderBy(r => r.PriceZAR).First()).PriceZAR;
        }
        catch
        {
            return 0m;
        }
    }

    [HttpPost("verify/{reference}")]
    public async Task<IActionResult> Verify(string reference)
    {
        var result = await _paystack.VerifyPaymentAsync(reference);
        if (result == null || result.Status != "success")
            return Ok(new { success = false });

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.PaystackPaymentReference == reference);
        if (order == null)
        {
            // Try matching by amount/reference stored after initiate — we store ref at initiate time below
            return Ok(new { success = false, message = "Order not found." });
        }

        order.IsPaid = true;
        order.PaidAt = DateTime.UtcNow;

        // Clear the cart
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var sessionToken = Request.Headers["X-Cart-Token"].FirstOrDefault();
        Cart? cart = null;
        if (!string.IsNullOrEmpty(userId))
            cart = await _db.Carts.FirstOrDefaultAsync(c => c.UserId == userId);
        else if (!string.IsNullOrEmpty(sessionToken))
            cart = await _db.Carts.FirstOrDefaultAsync(c => c.SessionToken == sessionToken);

        if (cart != null)
            _db.Carts.Remove(cart);

        await _db.SaveChangesAsync();

        return Ok(new { success = true, orderId = order.Id });
    }
}
