using BDP.API.Data;
using BDP.API.DTOs.Invoices;
using BDP.API.DTOs.Orders;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly InvoiceService _invoiceService;

    public OrdersController(AppDbContext context, InvoiceService invoiceService)
    {
        _context = context;
        _invoiceService = invoiceService;
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
        decimal shippingTotal = 0;
        foreach (var item in dto.Items)
        {
            var variantExists = await _context.ProductVariants.AnyAsync(pv => pv.Id == item.ProductVariantId);
            if (!variantExists)
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
        TotalZAR = o.TotalZAR,
        IsPaid = o.IsPaid,
        PaidAt = o.PaidAt,
        PaystackPaymentReference = o.PaystackPaymentReference,
        RecurringOrderId = o.RecurringOrderId,
        Notes = o.Notes,
        CreatedAt = o.CreatedAt,
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
