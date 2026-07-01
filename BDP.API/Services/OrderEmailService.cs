using BDP.API.Data;
using BDP.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BDP.API.Services;

/// <summary>
/// Builds and sends customer-facing order emails (confirmation, etc.).
/// Centralised so the Paystack webhook, checkout, and admin all send the same thing.
/// </summary>
public class OrderEmailService
{
    private readonly AppDbContext _db;
    private readonly EmailService _email;
    private readonly IConfiguration _config;
    private readonly ILogger<OrderEmailService> _logger;

    public OrderEmailService(AppDbContext db, EmailService email, IConfiguration config,
        ILogger<OrderEmailService> logger)
    {
        _db = db;
        _email = email;
        _config = config;
        _logger = logger;
    }

    private string StorefrontUrl =>
        Environment.GetEnvironmentVariable("STOREFRONT_URL")
        ?? _config["StorefrontUrl"]
        ?? "https://www.bedifferentpackaging.com";

    /// <summary>
    /// Sends the order confirmation email for a given order id. Safe to call
    /// fire-and-forget — failures are logged, never thrown.
    /// </summary>
    public async Task TrySendOrderConfirmationAsync(int orderId)
    {
        try
        {
            var order = await _db.Orders
                .Include(o => o.Client)
                .Include(o => o.Items).ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                _logger.LogWarning("Order confirmation skipped — order {OrderId} not found", orderId);
                return;
            }

            // Idempotent: only ever send one confirmation, no matter how many paths
            // (webhook, success-page verify, PayJustNow callback) call this.
            if (order.ConfirmationEmailSentAt != null)
                return;

            var email = ResolveRecipientEmail(order);
            if (string.IsNullOrEmpty(email))
            {
                _logger.LogInformation("Order confirmation skipped — no recipient email for order {OrderNumber}", order.OrderNumber);
                return;
            }

            var recipientName = ResolveRecipientName(order);

            var lines = order.Items.Select(i => new EmailTemplates.OrderLineData(
                ProductName: i.ProductVariant?.Product?.Name ?? "Item",
                Sku: i.ProductVariant?.SkuId ?? i.ProductVariant?.SKU ?? "",
                Quantity: i.Quantity,
                UnitPrice: i.UnitPriceZAR,
                LineTotal: i.LineTotal
            ));

            var data = new EmailTemplates.OrderConfirmationData(
                RecipientName: recipientName,
                OrderNumber: order.OrderNumber,
                OrderDate: order.OrderDate.ToString("d MMMM yyyy"),
                Lines: lines,
                SubtotalZAR: order.SubtotalZAR,
                ShippingZAR: order.ShippingCostZAR,
                TotalZAR: order.TotalZAR,
                ShippingServiceName: order.ShippingServiceName,
                TransitDaysMin: null,
                TransitDaysMax: null,
                ShippingAddress: order.ShippingAddressJson ?? "",
                StorefrontUrl: StorefrontUrl
            );

            var tmpl = await _email.GetTemplateAsync(_db, "order_confirmation");
            string subject, html;
            if (tmpl.HasValue)
            {
                var lineItemsHtml = string.Concat(data.Lines.Select(line =>
                    $"<p style=\"margin:4px 0;font-size:14px;color:#1C1A17;\">{line.ProductName} (SKU {line.Sku}) &times; {line.Quantity} &mdash; R {line.LineTotal:N2}</p>"));

                subject = tmpl.Value.Subject
                    .Replace("{{OrderNumber}}", order.OrderNumber);
                html = tmpl.Value.HtmlBody
                    .Replace("{{RecipientName}}", recipientName)
                    .Replace("{{OrderNumber}}", order.OrderNumber)
                    .Replace("{{OrderDate}}", data.OrderDate)
                    .Replace("{{LineItems}}", lineItemsHtml)
                    .Replace("{{SubtotalZAR}}", $"{data.SubtotalZAR:N2}")
                    .Replace("{{ShippingZAR}}", $"{data.ShippingZAR:N2}")
                    .Replace("{{TotalZAR}}", $"{data.TotalZAR:N2}")
                    .Replace("{{ShippingAddress}}", data.ShippingAddress)
                    .Replace("{{ShippingServiceName}}", data.ShippingServiceName ?? "Standard")
                    .Replace("{{StorefrontUrl}}", StorefrontUrl);
            }
            else
            {
                subject = $"Order confirmed — {order.OrderNumber}";
                html = EmailTemplates.OrderConfirmation(data);
            }

            await _email.SendAsync(email, recipientName, subject, html, category: "order_confirmation");

            order.ConfirmationEmailSentAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation("Order confirmation sent for {OrderNumber} to {Email}", order.OrderNumber, email);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send order confirmation for order {OrderId}", orderId);
        }
    }

    private static string? ResolveRecipientEmail(Order order)
    {
        if (!string.IsNullOrEmpty(order.GuestEmail)) return order.GuestEmail;
        if (order.Client != null && !string.IsNullOrEmpty(order.Client.ContactEmail)) return order.Client.ContactEmail;
        return null;
    }

    private static string ResolveRecipientName(Order order)
    {
        var name = order.Client?.ContactPersonName ?? "Customer";
        try
        {
            var addr = JsonSerializer.Deserialize<JsonElement>(order.ShippingAddressJson ?? "{}");
            if (addr.TryGetProperty("recipientName", out var rn))
                name = rn.GetString() ?? name;
        }
        catch { /* malformed address — keep fallback */ }
        return name;
    }
}
