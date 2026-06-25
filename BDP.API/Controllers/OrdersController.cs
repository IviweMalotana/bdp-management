using BDP.API.Data;
using BDP.API.DTOs.Invoices;
using BDP.API.DTOs.Orders;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly InvoiceService _invoiceService;
    private readonly YunExpressService _yunExpress;
    private readonly EmailService _email;

    public OrdersController(AppDbContext context, InvoiceService invoiceService,
        YunExpressService yunExpress, EmailService email)
    {
        _context = context;
        _invoiceService = invoiceService;
        _yunExpress = yunExpress;
        _email = email;
    }

    // GET /api/orders?status=X&from=Y&to=Z&page=1&pageSize=20
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.Orders
            .Include(o => o.Client)
            .Include(o => o.Items)
                .ThenInclude(oi => oi.ProductVariant)
                    .ThenInclude(pv => pv.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(o => o.Status == status);
        if (from.HasValue)
            query = query.Where(o => o.OrderDate >= from.Value.ToUniversalTime());
        if (to.HasValue)
            query = query.Where(o => o.OrderDate <= to.Value.ToUniversalTime());

        var total = await query.CountAsync();
        var orders = await query
            .OrderByDescending(o => o.OrderDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            items = orders.Select(MapToDto),
            totalCount = total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        });
    }

    // GET /api/orders/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var totalOrders = await _context.Orders.CountAsync();
        var revenueThisMonth = await _context.Orders
            .Where(o => o.OrderDate >= startOfMonth)
            .SumAsync(o => (decimal?)o.TotalZAR) ?? 0;

        var ordersByStatus = await _context.Orders
            .GroupBy(o => o.Status)
            .Select(g => new OrderStatusCountDto { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        return Ok(new OrderStatsDto
        {
            TotalOrders = totalOrders,
            RevenueThisMonth = revenueThisMonth,
            OrdersByStatus = ordersByStatus
        });
    }

    // GET /api/orders/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Client)
            .Include(o => o.Items)
                .ThenInclude(oi => oi.ProductVariant)
                    .ThenInclude(pv => pv.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound(new { message = $"Order {id} not found." });
        return Ok(MapToDto(order));
    }

    // POST /api/orders
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var clientExists = await _context.Clients.AnyAsync(c => c.Id == dto.ClientId);
        if (!clientExists)
            return BadRequest(new { message = "Client not found." });

        var orderDate = (dto.OrderDate ?? DateTime.UtcNow).ToUniversalTime();
        var orderNumber = await GenerateOrderNumberAsync(orderDate.Year);

        var order = new Order
        {
            OrderNumber = orderNumber,
            ClientId = dto.ClientId,
            Status = dto.Status,
            OrderDate = orderDate,
            RequiredByDate = dto.RequiredByDate?.ToUniversalTime(),
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow
        };

        decimal subtotal = 0;
        int totalWeightGrams = 0;

        // First pass: validate items and accumulate subtotal + weight
        var resolvedItems = new List<(CreateOrderItemDto dto, decimal lineTotal)>();
        foreach (var item in dto.Items)
        {
            var variant = await _context.ProductVariants
                .Include(pv => pv.Product)
                .FirstOrDefaultAsync(pv => pv.Id == item.ProductVariantId);
            if (variant == null)
                return BadRequest(new { message = $"ProductVariant {item.ProductVariantId} not found." });

            // Validate customisation minimum quantity
            if (item.CustomisationOptionId.HasValue)
            {
                var opt = await _context.CustomisationOptions.FindAsync(item.CustomisationOptionId.Value);
                if (opt != null && item.Quantity < opt.MinimumQuantity)
                    return BadRequest(new { message = $"Customisation option '{opt.Type}' requires a minimum quantity of {opt.MinimumQuantity}. You ordered {item.Quantity}." });
            }

            var lineTotal = item.UnitPriceZAR * item.Quantity + item.CustomisationCostZAR;
            subtotal += lineTotal;
            var unitWKg = variant.WeightKg > 0 ? variant.WeightKg : (variant.Product?.WeightKg ?? 0m);
            totalWeightGrams += (int)Math.Ceiling(unitWKg * 1000m * item.Quantity);
            resolvedItems.Add((item, lineTotal));
        }

        // Compute shipping via YunExpress
        var shippingSettings = await _context.ShippingSettings.FindAsync(1);
        var markupPct = shippingSettings?.ShippingMarkupPercent ?? 40m;
        decimal actualShipping = 0;
        decimal shippingTotal = 0;
        if (totalWeightGrams > 0)
        {
            var rates = await _yunExpress.GetRatesAsync("ZA", totalWeightGrams);
            var cheapest = rates
                .Where(r => !r.CustomsIncluded)
                .OrderBy(r => r.PriceZAR)
                .FirstOrDefault();
            if (cheapest != null)
            {
                actualShipping = cheapest.PriceZAR;
                shippingTotal = Math.Round(cheapest.PriceZAR * (1 + markupPct / 100m), 2);
            }
        }

        foreach (var (item, lineTotal) in resolvedItems)
        {
            order.Items.Add(new OrderItem
            {
                ProductVariantId = item.ProductVariantId,
                PricingTierId = item.PricingTierId,
                CustomisationOptionId = item.CustomisationOptionId,
                CustomisationPricingTierId = item.CustomisationPricingTierId,
                Quantity = item.Quantity,
                UnitPriceZAR = item.UnitPriceZAR,
                LineTotal = lineTotal,
                CustomisationCostZAR = item.CustomisationCostZAR,
                ShippingCostZAR = 0,  // shipping is tracked at order level
            });
        }

        order.SubtotalZAR = subtotal;
        order.ShippingCostZAR = shippingTotal;
        order.ActualShippingCostZAR = actualShipping;
        order.TotalZAR = subtotal + shippingTotal;

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var created = await _context.Orders
            .Include(o => o.Client)
            .Include(o => o.Items).ThenInclude(oi => oi.ProductVariant).ThenInclude(pv => pv.Product)
            .FirstAsync(o => o.Id == order.Id);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, MapToDto(created));
    }

    // PUT /api/orders/{id}/status
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var order = await _context.Orders
            .Include(o => o.Client)
            .Include(o => o.Items).ThenInclude(oi => oi.ProductVariant).ThenInclude(pv => pv.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound(new { message = $"Order {id} not found." });

        order.Status = dto.Status;
        await _context.SaveChangesAsync();
        return Ok(MapToDto(order));
    }

    // PUT /api/orders/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateOrderDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound(new { message = $"Order {id} not found." });

        var clientExists = await _context.Clients.AnyAsync(c => c.Id == dto.ClientId);
        if (!clientExists)
            return BadRequest(new { message = "Client not found." });

        order.ClientId = dto.ClientId;
        order.Status = dto.Status;
        order.RequiredByDate = dto.RequiredByDate?.ToUniversalTime();
        order.Notes = dto.Notes;

        _context.OrderItems.RemoveRange(order.Items);
        order.Items.Clear();

        decimal subtotal = 0;
        decimal shippingTotal = 0;
        foreach (var item in dto.Items)
        {
            var variantExists = await _context.ProductVariants.AnyAsync(pv => pv.Id == item.ProductVariantId);
            if (!variantExists)
                return BadRequest(new { message = $"ProductVariant {item.ProductVariantId} not found." });

            var lineTotal = item.UnitPriceZAR * item.Quantity + item.CustomisationCostZAR;
            subtotal += lineTotal;
            shippingTotal += item.ShippingCostZAR;

            order.Items.Add(new OrderItem
            {
                ProductVariantId = item.ProductVariantId,
                PricingTierId = item.PricingTierId,
                CustomisationOptionId = item.CustomisationOptionId,
                CustomisationPricingTierId = item.CustomisationPricingTierId,
                Quantity = item.Quantity,
                UnitPriceZAR = item.UnitPriceZAR,
                LineTotal = lineTotal,
                CustomisationCostZAR = item.CustomisationCostZAR,
                ShippingCostZAR = item.ShippingCostZAR,
            });
        }

        order.SubtotalZAR = subtotal;
        order.ShippingCostZAR = shippingTotal;
        order.TotalZAR = subtotal + shippingTotal;

        await _context.SaveChangesAsync();

        var updated = await _context.Orders
            .Include(o => o.Client)
            .Include(o => o.Items).ThenInclude(oi => oi.ProductVariant).ThenInclude(pv => pv.Product)
            .FirstAsync(o => o.Id == id);

        return Ok(MapToDto(updated));
    }

    // POST /api/orders/{id}/invoice
    [HttpPost("{id:int}/invoice")]
    public async Task<IActionResult> GenerateAndSendInvoice(int id)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return NotFound(new { message = $"Order {id} not found." });

        Invoice invoice;
        var existing = await _context.Invoices.FirstOrDefaultAsync(i => i.OrderId == id);
        if (existing != null)
        {
            invoice = existing;
        }
        else
        {
            invoice = await _invoiceService.GenerateInvoiceAsync(id);
        }

        await _invoiceService.SendInvoiceAsync(invoice.Id);

        return Ok(new InvoiceDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            OrderId = invoice.OrderId,
            ClientId = invoice.ClientId,
            InvoiceDate = invoice.InvoiceDate,
            DueDate = invoice.DueDate,
            SubtotalZAR = invoice.SubtotalZAR,
            VatZAR = invoice.VatZAR,
            TotalZAR = invoice.TotalZAR,
            Status = invoice.Status,
            PdfUrl = invoice.PdfUrl,
            SentAt = invoice.SentAt,
            PaystackPaymentRequestId = invoice.PaystackPaymentRequestId,
            CreatedAt = invoice.CreatedAt
        });
    }

    // GET /api/orders/{id}/invoice
    [HttpGet("{id:int}/invoice")]
    public async Task<IActionResult> GetInvoice(int id)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Order)
            .Include(i => i.Client)
            .FirstOrDefaultAsync(i => i.OrderId == id);
        if (invoice == null) return NotFound(new { message = "No invoice for this order." });

        return Ok(new InvoiceDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            OrderId = invoice.OrderId,
            OrderNumber = invoice.Order.OrderNumber,
            ClientId = invoice.ClientId,
            ClientName = invoice.Client.CompanyName,
            InvoiceDate = invoice.InvoiceDate,
            DueDate = invoice.DueDate,
            SubtotalZAR = invoice.SubtotalZAR,
            VatZAR = invoice.VatZAR,
            TotalZAR = invoice.TotalZAR,
            Status = invoice.Status,
            PdfUrl = invoice.PdfUrl,
            SentAt = invoice.SentAt,
            PaidAt = invoice.PaidAt,
            PaystackPaymentRequestId = invoice.PaystackPaymentRequestId,
            CreatedAt = invoice.CreatedAt
        });
    }

    // ── Fulfilment endpoints ───────────────────────────────────────────────────

    public record CreateShipmentRequest(
        string ProductCode,
        decimal WeightKg,
        decimal LengthCm,
        decimal WidthCm,
        decimal HeightCm,
        int Pieces,
        decimal DeclaredValueUSD,
        string RecipientName,
        string RecipientPhone,
        string RecipientAddress,
        string RecipientCity,
        string RecipientPostcode,
        string CountryCode = "ZA",
        string RecipientProvince = ""
    );

    public record MarkShippedRequest(string TrackingNumber, string? TrackingCarrier = "Manual");

    // POST /api/orders/{id}/shipment
    [HttpPost("{id:int}/shipment")]
    public async Task<IActionResult> CreateShipment(int id, [FromBody] CreateShipmentRequest dto)
    {
        var order = await _context.Orders
            .Include(o => o.Client)
            .Include(o => o.Items).ThenInclude(oi => oi.ProductVariant).ThenInclude(pv => pv.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound(new { message = $"Order {id} not found." });
        if (!string.IsNullOrEmpty(order.TrackingNumber))
            return BadRequest(new { message = "Order already has a tracking number." });
        if (!_yunExpress.HasCredentials)
            return BadRequest(new { message = "YunExpress credentials not configured. Set YunExpress__AppKey and YunExpress__AppToken in Railway." });

        // Province: prefer what the caller sent; otherwise pull it from the order's
        // saved shipping address so the YunExpress order has a valid province.
        var province = dto.RecipientProvince;
        if (string.IsNullOrWhiteSpace(province) && !string.IsNullOrEmpty(order.ShippingAddressJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(order.ShippingAddressJson);
                if (doc.RootElement.TryGetProperty("Province", out var p))
                    province = p.GetString() ?? "";
            }
            catch { /* malformed address JSON — fall through with empty province */ }
        }

        var result = await _yunExpress.CreateOrderAsync(new YunExpressService.CreateOrderRequest(
            OrderReference: order.OrderNumber,
            CountryCode: dto.CountryCode,
            ProductCode: dto.ProductCode,
            WeightKg: dto.WeightKg,
            LengthCm: dto.LengthCm,
            WidthCm: dto.WidthCm,
            HeightCm: dto.HeightCm,
            Pieces: dto.Pieces,
            DeclaredValueUSD: dto.DeclaredValueUSD,
            RecipientName: dto.RecipientName,
            RecipientPhone: dto.RecipientPhone,
            RecipientAddress: dto.RecipientAddress,
            RecipientCity: dto.RecipientCity,
            RecipientPostcode: dto.RecipientPostcode,
            RecipientProvince: province
        ));

        if (!result.Success)
            return StatusCode(502, new { message = result.ErrorMessage });

        order.TrackingNumber = result.WaybillNumber;
        order.TrackingCarrier = "YunExpress";
        order.YunOrderId = result.YunOrderId;
        order.Status = "Shipped";
        order.ShippedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await TrySendShippedEmail(order);

        return Ok(new { trackingNumber = result.WaybillNumber, yunOrderId = result.YunOrderId, labelUrl = result.LabelUrl });
    }

    // POST /api/orders/shipment/test
    // Fire a mock/test YunExpress shipment without touching a real order.
    //   ?dryRun=true  → returns the exact SOAP payload we'd send (no transmission, credentials redacted)
    //   ?dryRun=false → creates a REAL test order at YunExpress, then cancels it, returning the waybill
    [HttpPost("shipment/test")]
    public async Task<IActionResult> TestShipment([FromBody] CreateShipmentRequest dto, [FromQuery] bool dryRun = true)
    {
        var req = new YunExpressService.CreateOrderRequest(
            OrderReference: $"TEST-{DateTime.UtcNow:yyyyMMddHHmmss}",
            CountryCode: dto.CountryCode,
            ProductCode: dto.ProductCode,
            WeightKg: dto.WeightKg,
            LengthCm: dto.LengthCm,
            WidthCm: dto.WidthCm,
            HeightCm: dto.HeightCm,
            Pieces: dto.Pieces,
            DeclaredValueUSD: dto.DeclaredValueUSD,
            RecipientName: dto.RecipientName,
            RecipientPhone: dto.RecipientPhone,
            RecipientAddress: dto.RecipientAddress,
            RecipientCity: dto.RecipientCity,
            RecipientPostcode: dto.RecipientPostcode,
            RecipientProvince: dto.RecipientProvince
        );

        if (dryRun)
        {
            // No network call — preview the payload so you can eyeball province/postcode/weights.
            return Ok(new
            {
                mode = "dry-run",
                reference = req.OrderReference,
                hasCredentials = _yunExpress.HasCredentials,
                soapPayload = _yunExpress.PreviewCreateOrderPayload(req)
            });
        }

        if (!_yunExpress.HasCredentials)
            return BadRequest(new { message = "YunExpress credentials not configured. Set YunExpress__AppKey and YunExpress__AppToken in Railway." });

        var result = await _yunExpress.CreateOrderAsync(req);
        if (!result.Success)
            return StatusCode(502, new { mode = "live-test", success = false, message = result.ErrorMessage });

        // Immediately cancel so the test order doesn't actually ship.
        var cancelled = false;
        if (!string.IsNullOrEmpty(result.YunOrderId))
            cancelled = await _yunExpress.CancelOrderAsync(result.YunOrderId);

        return Ok(new
        {
            mode = "live-test",
            success = true,
            reference = req.OrderReference,
            trackingNumber = result.WaybillNumber,
            yunOrderId = result.YunOrderId,
            labelUrl = result.LabelUrl,
            cancelled,
            note = cancelled
                ? "Test order created and cancelled at YunExpress."
                : "Test order created but could NOT be auto-cancelled — cancel it manually in the YunExpress portal."
        });
    }

    // GET /api/orders/{id}/shipment/label
    [HttpGet("{id:int}/shipment/label")]
    public async Task<IActionResult> GetShipmentLabel(int id)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return NotFound(new { message = $"Order {id} not found." });
        if (string.IsNullOrEmpty(order.TrackingNumber))
            return BadRequest(new { message = "Order has no tracking number." });

        var (pdfBytes, labelUrl) = await _yunExpress.GetLabelAsync(order.TrackingNumber);

        if (pdfBytes != null && pdfBytes.Length > 0)
            return File(pdfBytes, "application/pdf", $"label-{order.OrderNumber}.pdf");
        if (!string.IsNullOrEmpty(labelUrl))
            return Ok(new { labelUrl });

        return StatusCode(502, new { message = "Could not retrieve label from YunExpress." });
    }

    // DELETE /api/orders/{id}/shipment
    [HttpDelete("{id:int}/shipment")]
    public async Task<IActionResult> CancelShipment(int id)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return NotFound(new { message = $"Order {id} not found." });
        if (string.IsNullOrEmpty(order.YunOrderId))
            return BadRequest(new { message = "Order has no YunExpress order ID." });

        var success = await _yunExpress.CancelOrderAsync(order.YunOrderId);
        if (!success)
            return StatusCode(502, new { message = "YunExpress could not cancel the shipment." });

        order.TrackingNumber = null;
        order.YunOrderId = null;
        order.TrackingCarrier = null;
        order.Status = "Confirmed";
        order.ShippedDate = null;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Shipment cancelled." });
    }

    // GET /api/orders/{id}/shipment/info
    [HttpGet("{id:int}/shipment/info")]
    public async Task<IActionResult> GetShipmentInfo(int id)
    {
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return NotFound(new { message = $"Order {id} not found." });
        if (string.IsNullOrEmpty(order.TrackingNumber))
            return BadRequest(new { message = "Order has no tracking number." });

        var info = await _yunExpress.GetOrderInfoAsync(order.TrackingNumber);
        if (info == null)
            return StatusCode(502, new { message = "Could not retrieve order info from YunExpress." });

        return Ok(info);
    }

    // PATCH /api/orders/{id}/mark-shipped
    [HttpPatch("{id:int}/mark-shipped")]
    public async Task<IActionResult> MarkShipped(int id, [FromBody] MarkShippedRequest dto)
    {
        var order = await _context.Orders
            .Include(o => o.Client)
            .Include(o => o.Items).ThenInclude(oi => oi.ProductVariant).ThenInclude(pv => pv.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound(new { message = $"Order {id} not found." });

        order.TrackingNumber = dto.TrackingNumber;
        order.TrackingCarrier = dto.TrackingCarrier ?? "Manual";
        order.Status = "Shipped";
        order.ShippedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await TrySendShippedEmail(order);

        return Ok(MapToDto(order));
    }

    private async Task TrySendShippedEmail(Order order)
    {
        var email = order.GuestEmail;
        if (string.IsNullOrEmpty(email) && order.Client != null)
            email = order.Client.ContactEmail;
        if (string.IsNullOrEmpty(email)) return;

        string recipientName = order.Client?.ContactPersonName ?? "Customer";
        try
        {
            var addr = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(
                order.ShippingAddressJson ?? "{}");
            if (addr.TryGetProperty("recipientName", out var rn))
                recipientName = rn.GetString() ?? recipientName;
        }
        catch { }

        var data = new EmailTemplates.OrderShippedData(
            RecipientName: recipientName,
            OrderNumber: order.OrderNumber,
            TrackingNumber: order.TrackingNumber,
            TrackingCarrier: order.TrackingCarrier,
            ShippingServiceName: order.ShippingServiceName,
            TransitDaysMin: null,
            TransitDaysMax: null,
            ShippingAddress: order.ShippingAddressJson ?? ""
        );

        var storefrontUrl = Environment.GetEnvironmentVariable("STOREFRONT_URL") ?? "https://bdp-management.vercel.app";
        var tmpl = await _email.GetTemplateAsync(_context, "order_shipped");
        string subject, html;
        if (tmpl.HasValue)
        {
            subject = tmpl.Value.Subject
                .Replace("{{OrderNumber}}", order.OrderNumber);
            html = tmpl.Value.HtmlBody
                .Replace("{{RecipientName}}", recipientName)
                .Replace("{{OrderNumber}}", order.OrderNumber)
                .Replace("{{TrackingNumber}}", order.TrackingNumber ?? "")
                .Replace("{{TrackingCarrier}}", order.TrackingCarrier ?? "YunExpress")
                .Replace("{{ShippingAddress}}", order.ShippingAddressJson ?? "")
                .Replace("{{ShippingServiceName}}", order.ShippingServiceName ?? "Standard")
                .Replace("{{StorefrontUrl}}", storefrontUrl);
        }
        else
        {
            subject = $"Your BDP order {order.OrderNumber} is on its way";
            html = EmailTemplates.OrderShipped(data);
        }

        await _email.SendAsync(email, recipientName, subject, html, category: "order_shipped");
    }

    // GET /api/orders/shipping-margin?from=&to=&page=1&pageSize=50
    [HttpGet("shipping-margin")]
    public async Task<IActionResult> GetShippingMargin(
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _context.Orders
            .Include(o => o.Client)
            .Include(o => o.Items)
            .Where(o => o.ActualShippingCostZAR > 0)
            .AsQueryable();

        if (from.HasValue)
            query = query.Where(o => o.OrderDate >= from.Value.ToUniversalTime());
        if (to.HasValue)
            query = query.Where(o => o.OrderDate <= to.Value.ToUniversalTime());

        // Pull all matching for summary (then page in memory)
        var allMatching = await query.OrderByDescending(o => o.OrderDate).ToListAsync();

        var totalShippingCharged = allMatching.Sum(o => o.ShippingCostZAR);
        var totalActualCost = allMatching.Sum(o => o.ActualShippingCostZAR);
        var totalShippingMargin = totalShippingCharged - totalActualCost;
        var avgMarginPct = totalShippingCharged > 0
            ? Math.Round((totalShippingMargin / totalShippingCharged) * 100, 2)
            : 0m;
        var totalCount = allMatching.Count;

        var paged = allMatching
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o =>
            {
                var charged = o.ShippingCostZAR;
                var actual = o.ActualShippingCostZAR;
                var margin = charged - actual;
                var marginPct = charged > 0 ? Math.Round((margin / charged) * 100, 2) : 0m;
                var units = o.Items?.Sum(i => i.Quantity) ?? 0;
                var clientName = o.Client?.CompanyName ?? o.GuestEmail ?? "Guest";
                return new
                {
                    orderId = o.Id,
                    orderNumber = o.OrderNumber,
                    orderDate = o.OrderDate,
                    clientName,
                    units,
                    shippingCharged = charged,
                    actualShippingCost = actual,
                    shippingMargin = margin,
                    shippingMarginPct = marginPct,
                    shippingServiceName = o.ShippingServiceName,
                    totalZAR = o.TotalZAR
                };
            })
            .ToList();

        return Ok(new
        {
            items = paged,
            totalCount,
            summary = new
            {
                totalShippingCharged,
                totalActualCost,
                totalShippingMargin,
                avgMarginPct,
                ordersWithRealCost = totalCount
            }
        });
    }

    // ── Helpers ────────────────────────────────────────────────────────────
    private async Task<string> GenerateOrderNumberAsync(int year)
    {
        var prefix = $"BDP-{year}-";
        var latest = await _context.Orders
            .Where(o => o.OrderNumber.StartsWith(prefix))
            .OrderByDescending(o => o.OrderNumber)
            .Select(o => o.OrderNumber)
            .FirstOrDefaultAsync();

        int next = 1;
        if (latest != null)
        {
            var parts = latest.Split('-');
            if (parts.Length == 3 && int.TryParse(parts[2], out var seq))
                next = seq + 1;
        }

        return $"{prefix}{next:D3}";
    }

    internal static OrderDto MapToDto(Order o) => new()
    {
        Id = o.Id,
        OrderNumber = o.OrderNumber,
        ClientId = o.ClientId ?? 0,
        ClientName = o.Client?.CompanyName ?? string.Empty,
        Status = o.Status,
        OrderDate = o.OrderDate,
        RequiredByDate = o.RequiredByDate,
        ShippedDate = o.ShippedDate,
        DeliveredDate = o.DeliveredDate,
        SubtotalZAR = o.SubtotalZAR,
        ShippingCostZAR = o.ShippingCostZAR,
        ActualShippingCostZAR = o.ActualShippingCostZAR,
        TotalZAR = o.TotalZAR,
        IsPaid = o.IsPaid,
        PaidAt = o.PaidAt,
        PaystackPaymentReference = o.PaystackPaymentReference,
        RecurringOrderId = o.RecurringOrderId,
        Notes = o.Notes,
        CreatedAt = o.CreatedAt,
        TrackingNumber = o.TrackingNumber,
        TrackingCarrier = o.TrackingCarrier,
        YunOrderId = o.YunOrderId,
        FulfilmentStatus = o.FulfilmentStatus,
        ShippingServiceCode = o.ShippingServiceCode,
        ShippingServiceName = o.ShippingServiceName,
        Items = o.Items?.Select(oi => new OrderItemDto
        {
            Id = oi.Id,
            OrderId = oi.OrderId,
            ProductVariantId = oi.ProductVariantId,
            ProductName = oi.ProductVariant?.Product?.Name ?? string.Empty,
            VariantSku = oi.ProductVariant?.SKU ?? string.Empty,
            PricingTierId = oi.PricingTierId,
            CustomisationOptionId = oi.CustomisationOptionId,
            CustomisationPricingTierId = oi.CustomisationPricingTierId,
            Quantity = oi.Quantity,
            UnitPriceZAR = oi.UnitPriceZAR,
            LineTotal = oi.LineTotal,
            CustomisationCostZAR = oi.CustomisationCostZAR,
            ShippingCostZAR = oi.ShippingCostZAR,
        }).ToList() ?? new()
    };
}
