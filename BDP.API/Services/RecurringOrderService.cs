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
            var delay = TimeUntilNextRun();
            _logger.LogInformation("RecurringOrderService sleeping {Minutes} minutes until next run", delay.TotalMinutes);
            await Task.Delay(delay, stoppingToken);
            await ProcessDueOrdersAsync(stoppingToken);
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
        var shippingService = scope.ServiceProvider.GetRequiredService<ShippingCalculatorService>();

        var today = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, SaTimeZone).Date;

        var dueOrders = await context.RecurringOrders
            .Include(r => r.Client)
            .Include(r => r.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v.Product)
            .Include(r => r.Items)
                .ThenInclude(i => i.CustomisationOption)
            .Where(r => r.Status == RecurringOrderStatus.Active && r.NextOrderDate.Date <= today)
            .ToListAsync(ct);

        _logger.LogInformation("Processing {Count} due recurring orders", dueOrders.Count);

        foreach (var recurring in dueOrders)
        {
            try
            {
                var order = await GenerateOrderAsync(context, recurring, shippingService, ct);
                recurring.NextOrderDate = recurring.NextOrderDate.AddDays(recurring.FrequencyDays);
                await context.SaveChangesAsync(ct);

                await NotifyClientAsync(emailService, recurring.Client, order, recurring);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process recurring order {Id}", recurring.Id);
            }
        }
    }

    private async Task<Order> GenerateOrderAsync(
        AppDbContext context, RecurringOrder recurring,
        ShippingCalculatorService shipping, CancellationToken ct)
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
        decimal shippingCost = 0;

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

            var unitPrice = tier.SalePriceZAR;
            var lineTotal = unitPrice * item.Quantity;
            var itemShipping = await shipping.CalculateAsync(
                product.WeightKg, ShippingCalculator.ComputeVolumeCBM(product.LengthCm, product.WidthCm, product.HeightCm),
                item.Quantity);

            subtotal += lineTotal;
            shippingCost += itemShipping;

            order.Items.Add(new OrderItem
            {
                ProductVariantId = variant.Id,
                PricingTierId = tier.Id,
                CustomisationOptionId = item.CustomisationOptionId,
                Quantity = item.Quantity,
                UnitPriceZAR = unitPrice,
                LineTotal = lineTotal,
                ShippingCostZAR = itemShipping
            });
        }

        order.SubtotalZAR = subtotal;
        order.ShippingCostZAR = shippingCost;
        order.TotalZAR = subtotal + shippingCost;

        context.Orders.Add(order);
        return order;
    }

    private async Task NotifyClientAsync(EmailService email, Client client, Order order, RecurringOrder recurring)
    {
        var html = $"""
            <p>Dear {client.ContactPersonName},</p>
            <p>Your recurring order <strong>{recurring.Name}</strong> has been generated.</p>
            <p>Order Number: <strong>{order.OrderNumber}</strong></p>
            <p>Total: <strong>R {order.TotalZAR:N2}</strong></p>
            <p>Our team will be in touch to confirm delivery details.</p>
            <p>Regards,<br/>Victor the Label (Pty) Ltd</p>
            """;

        await email.SendAsync(
            client.ContactEmail,
            client.ContactPersonName,
            $"Order Generated: {order.OrderNumber}",
            html);
    }
}
