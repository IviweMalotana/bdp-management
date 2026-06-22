using BDP.API.Data;
using BDP.API.DTOs.Paystack;
using BDP.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/webhooks/paystack")]
public class PaystackWebhookController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly PaystackService _paystack;
    private readonly OrderEmailService _orderEmail;
    private readonly ILogger<PaystackWebhookController> _logger;

    public PaystackWebhookController(AppDbContext context, PaystackService paystack,
        OrderEmailService orderEmail, ILogger<PaystackWebhookController> logger)
    {
        _context = context;
        _paystack = paystack;
        _orderEmail = orderEmail;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Handle()
    {
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync();

        var signature = Request.Headers["X-Paystack-Signature"].ToString();
        if (!_paystack.VerifyWebhookSignature(rawBody, signature))
        {
            _logger.LogWarning("Invalid Paystack webhook signature");
            return Unauthorized();
        }

        PaystackWebhookPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<PaystackWebhookPayload>(rawBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse Paystack webhook payload");
            return BadRequest();
        }

        if (payload == null) return BadRequest();

        _logger.LogInformation("Paystack webhook: {Event} for {Reference}", payload.Event, payload.Data.Reference);

        if (payload.Event is "charge.success" or "paymentrequest.success")
            await HandlePaymentSuccess(payload.Data);

        return Ok();
    }

    private async Task HandlePaymentSuccess(PaystackWebhookData data)
    {
        // Track an order that transitions to paid for the first time so we send
        // exactly one confirmation email (Paystack retries webhooks).
        int? newlyPaidOrderId = null;

        // Update invoice if metadata contains invoice_id
        var invoiceId = data.Metadata?.InvoiceId;
        if (invoiceId.HasValue)
        {
            var invoice = await _context.Invoices.FindAsync(invoiceId.Value);
            if (invoice != null)
            {
                invoice.Status = "Paid";
                invoice.PaidAt = data.PaidAt ?? DateTime.UtcNow;
            }
        }

        // Update order if metadata contains order_id
        var orderId = data.Metadata?.OrderId;
        if (orderId.HasValue)
        {
            var order = await _context.Orders.FindAsync(orderId.Value);
            if (order != null)
            {
                if (!order.IsPaid) newlyPaidOrderId = order.Id;
                order.IsPaid = true;
                order.PaidAt = data.PaidAt ?? DateTime.UtcNow;
                order.PaystackPaymentReference = data.Reference;
            }
        }

        // Fall back to reference matching on orders
        if (!invoiceId.HasValue && !orderId.HasValue && !string.IsNullOrEmpty(data.Reference))
        {
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.PaystackPaymentReference == data.Reference);
            if (order != null)
            {
                if (!order.IsPaid) newlyPaidOrderId = order.Id;
                order.IsPaid = true;
                order.PaidAt = data.PaidAt ?? DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();

        // Send the customer their confirmation once payment is locked in.
        if (newlyPaidOrderId.HasValue)
            await _orderEmail.TrySendOrderConfirmationAsync(newlyPaidOrderId.Value);
    }
}
