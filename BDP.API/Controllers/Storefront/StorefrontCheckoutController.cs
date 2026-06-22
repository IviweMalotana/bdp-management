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

    public StorefrontCheckoutController(
        AppDbContext db,
        ShippingCalculatorService shipping,
        PaystackService paystack,
        IConfiguration config,
        PricingService pricing)
    {
        _db = db;
        _shipping = shipping;
        _paystack = paystack;
        _config = config;
        _pricing = pricing;
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
            var product = item.ProductVariant.Product;
            totalWeight += product.WeightKg * item.Quantity;
            totalVolume += ShippingCalculator.ComputeVolumeCBM(product.LengthCm, product.WidthCm, product.HeightCm) * item.Quantity;
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

            var tier = tiers.LastOrDefault(t => t.Quantity <= item.Quantity) ?? tiers.First();
            var unitPrice = tier.Quantity > 0 ? tier.SalePriceZAR / tier.Quantity : 0m;
            var lineTotal = unitPrice * item.Quantity;
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

        var totalWeight = cart.Items.Sum(i => i.ProductVariant.Product.WeightKg * i.Quantity);
        var totalVolume = cart.Items.Sum(i => ShippingCalculator.ComputeVolumeCBM(
            i.ProductVariant.Product.LengthCm, i.ProductVariant.Product.WidthCm, i.ProductVariant.Product.HeightCm) * i.Quantity);
        // If client provided a shipping option price, use it; otherwise fall back to calculator
        var shippingZAR = req.ShippingPriceZAR.HasValue && req.ShippingPriceZAR.Value > 0
            ? req.ShippingPriceZAR.Value
            : await _shipping.CalculateAsync(totalWeight, totalVolume, cart.Items.Sum(i => i.Quantity));

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
