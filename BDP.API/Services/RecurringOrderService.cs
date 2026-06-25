using BDP.API.Data;
using BDP.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Services;

public class RecurringOrderService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RecurringOrderService> _logger;

    private static readonly TimeZoneInfo SaTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById(
            OperatingSystem.IsWindows() ? "South Africa Standard Time" : "Africa/Johannesburg");

    public RecurringOrderService(IServiceScopeFactory scopeFactory, ILogger<RecurringOrderService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var delay = TimeUntilNextRun();
                _logger.LogInformation("RecurringOrderService sleeping {Minutes} minutes until next run", delay.TotalMinutes);
                await Task.Delay(delay, stoppingToken);

                if (stoppingToken.IsCancellationRequested) break;

                await ProcessDueOrdersAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Normal shutdown — exit the loop quietly.
                break;
            }
            catch (Exception ex)
            {
                // Never let an unhandled exception tear down the host. Log it,
                // wait a bit, then carry on so the API stays up.
                _logger.LogError(ex, "RecurringOrderService run failed; will retry at next scheduled time");
                try { await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken); }
                catch (OperationCanceledException) { break; }
            }
        }
    }

    private TimeSpan TimeUntilNextRun()
    {
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, SaTimeZone);
        var next6am = now.Date.AddHours(6);
        if (now >= next6am)
            next6am = next6am.AddDays(1);
        return next6am - now;
    }

    public async Task ProcessDueOrdersAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<EmailService>();
        var yunExpress = scope.ServiceProvider.GetRequiredService<YunExpressService>();

        // Build the cutoff as a proper UTC instant: end of "today" in SA time,
        // converted to UTC. Comparing the timestamptz column against a UTC value
        // avoids the Npgsql "Kind=Unspecified" error and the SQL .Date translation.
        var nowSa = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, SaTimeZone);
        var endOfTodaySa = DateTime.SpecifyKind(nowSa.Date.AddDays(1).AddTicks(-1), DateTimeKind.Unspecified);
        var cutoffUtc = TimeZoneInfo.ConvertTimeToUtc(endOfTodaySa, SaTimeZone);

        var dueOrders = await context.RecurringOrders
            .Include(r => r.Client)
            .Include(r => r.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v.Product)
            .Include(r => r.Items)
                .ThenInclude(i => i.CustomisationOption)
            .Where(r => r.Status == RecurringOrderStatus.Active && r.NextOrderDate <= cutoffUtc)
            .ToListAsync(ct);

        _logger.LogInformation("Processing {Count} due recurring orders", dueOrders.Count);

        foreach (var recurring in dueOrders)
        {
            try
            {
                var order = await GenerateOrderAsync(context, recurring, yunExpress, ct);
                recurring.NextOrderDate = recurring.NextOrderDate.AddDays(recurring.FrequencyDays);
                await context.SaveChangesAsync(ct);

                await NotifyClientAsync(emailService, context, recurring.Client, order, recurring);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process recurring order {Id}", recurring.Id);
            }
        }
    }

    private async Task<Order> GenerateOrderAsync(
        AppDbContext context, RecurringOrder recurring,
        YunExpressService yunExpress, CancellationToken ct)
    {
        var orderNumber = $"RO-{recurring.Id:D4}-{DateTime.UtcNow:yyyyMMdd}";
        var order = new Order
        {
            OrderNumber = orderNumber,
            ClientId = recurring.ClientId,
            Status = OrderStatus.Pending,
            OrderDate = DateTime.UtcNow,
            RecurringOrderId = recurring.Id,
            Notes = $"Auto-generated from recurring order: {recurring.Name}"
        };

        decimal subtotal = 0;

        // Load shipping markup setting
        var shippingSettings = await context.ShippingSettings.FindAsync(1);
        var markupPct = shippingSettings?.ShippingMarkupPercent ?? 40m;

        // Accumulate total weight across all items for a single YunExpress rate call
        int totalWeightGrams = 0;
        var lineItems = new List<(RecurringOrderItem item, ProductVariant variant, ProductPricingTier tier, int weightGrams)>();

        foreach (var item in recurring.Items)
        {
            var variant = item.ProductVariant;
            var product = variant.Product;
            var tier = await context.ProductPricingTiers
                .Where(t => t.ProductVariantId == variant.Id && t.Quantity <= item.Quantity)
                .OrderByDescending(t => t.Quantity)
                .FirstOrDefaultAsync(ct);

            if (tier == null)
            {
                _logger.LogWarning("No pricing tier found for variant {VariantId} qty {Qty} — skipping item", variant.Id, item.Quantity);
                continue;
            }

            var itemWeightGrams = (int)Math.Ceiling(product.WeightKg * 1000m * item.Quantity);
            totalWeightGrams += itemWeightGrams;

            var unitPrice = tier.SalePriceZAR;
            var lineTotal = unitPrice * item.Quantity;
            subtotal += lineTotal;
            lineItems.Add((item, variant, tier, itemWeightGrams));
        }

        // Get YunExpress rate for total shipment weight
        decimal shippingCost = 0;
        if (totalWeightGrams > 0)
        {
            var rates = await yunExpress.GetRatesAsync("ZA", totalWeightGrams);
            var cheapest = rates
                .Where(r => !r.CustomsIncluded)  // exclude DDP options
                .OrderBy(r => r.PriceZAR)
                .FirstOrDefault();
            if (cheapest != null)
                shippingCost = Math.Round(cheapest.PriceZAR * (1 + markupPct / 100m), 2);
        }

        foreach (var (item, variant, tier, _) in lineItems)
        {
            var unitPrice = tier.SalePriceZAR;
            var lineTotal = unitPrice * item.Quantity;
            order.Items.Add(new OrderItem
            {
                ProductVariantId = variant.Id,
                PricingTierId = tier.Id,
                CustomisationOptionId = item.CustomisationOptionId,
                Quantity = item.Quantity,
                UnitPriceZAR = unitPrice,
                LineTotal = lineTotal,
                ShippingCostZAR = 0  // shipping stored at order level, not per-item
            });
        }

        order.SubtotalZAR = subtotal;
        order.ShippingCostZAR = shippingCost;
        order.TotalZAR = subtotal + shippingCost;

        context.Orders.Add(order);
        return order;
    }

    private async Task NotifyClientAsync(EmailService email, AppDbContext db, Client client, Order order, RecurringOrder recurring)
    {
        var tmpl = await email.GetTemplateAsync(db, "recurring_order_generated");
        string subject, html;
        if (tmpl.HasValue)
        {
            subject = tmpl.Value.Subject
                .Replace("{{OrderNumber}}", order.OrderNumber);
            html = tmpl.Value.HtmlBody
                .Replace("{{RecipientName}}", client.ContactPersonName)
                .Replace("{{RecurringOrderName}}", recurring.Name)
                .Replace("{{OrderNumber}}", order.OrderNumber)
                .Replace("{{TotalZAR}}", $"{order.TotalZAR:N2}");
        }
        else
        {
            subject = $"Order Generated: {order.OrderNumber}";
            html = $"""
                <p>Dear {client.ContactPersonName},</p>
                <p>Your recurring order <strong>{recurring.Name}</strong> has been generated.</p>
                <p>Order Number: <strong>{order.OrderNumber}</strong></p>
                <p>Total: <strong>R {order.TotalZAR:N2}</strong></p>
                <p>Our team will be in touch to confirm delivery details.</p>
                <p>Regards,<br/>Victor the Label (Pty) Ltd</p>
                """;
        }

        await email.SendAsync(
            client.ContactEmail,
            client.ContactPersonName,
            subject,
            html,
            category: "recurring_order_generated");
    }
}
