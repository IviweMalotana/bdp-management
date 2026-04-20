using BDP.API.Data;
using BDP.API.DTOs.Orders;
using BDP.API.Models;
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

    public OrdersController(AppDbContext context) => _context = context;

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
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
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
            .SumAsync(o => (decimal?)o.TotalAmountZAR) ?? 0;

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
            .Include(o => o.Customer)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound(new { message = $"Order {id} not found." });
        return Ok(MapToDto(order));
    }

    // POST /api/orders
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var customerExists = await _context.Customers.AnyAsync(c => c.Id == dto.CustomerId);
        if (!customerExists)
            return BadRequest(new { message = "Customer not found." });

        var orderDate = (dto.OrderDate ?? DateTime.UtcNow).ToUniversalTime();
        var orderNumber = await GenerateOrderNumberAsync(orderDate.Year);

        var order = new Order
        {
            OrderNumber = orderNumber,
            CustomerId = dto.CustomerId,
            Status = dto.Status,
            OrderDate = orderDate,
            EstimatedDeliveryDate = orderDate.AddDays(84),
            BrandingType = dto.BrandingType,
            Notes = dto.Notes,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Build order items and calculate total
        decimal total = 0;
        foreach (var item in dto.Items)
        {
            var productExists = await _context.Products.AnyAsync(p => p.Id == item.ProductId);
            if (!productExists)
                return BadRequest(new { message = $"Product {item.ProductId} not found." });

            var lineTotal = item.UnitPriceZAR * item.Quantity + item.BrandingCostZAR;
            total += lineTotal;

            order.OrderItems.Add(new OrderItem
            {
                ProductId = item.ProductId,
                SKU = item.SKU,
                Quantity = item.Quantity,
                UnitPriceZAR = item.UnitPriceZAR,
                TotalPriceZAR = lineTotal,
                BrandingCostZAR = item.BrandingCostZAR
            });
        }

        order.TotalAmountZAR = total;

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        var created = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
            .FirstAsync(o => o.Id == order.Id);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, MapToDto(created));
    }

    // PUT /api/orders/{id}/status
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound(new { message = $"Order {id} not found." });

        order.Status = dto.Status;
        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(MapToDto(order));
    }

    // PUT /api/orders/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateOrderDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound(new { message = $"Order {id} not found." });

        var customerExists = await _context.Customers.AnyAsync(c => c.Id == dto.CustomerId);
        if (!customerExists)
            return BadRequest(new { message = "Customer not found." });

        order.CustomerId = dto.CustomerId;
        order.Status = dto.Status;
        order.EstimatedDeliveryDate = dto.EstimatedDeliveryDate?.ToUniversalTime();
        order.BrandingType = dto.BrandingType;
        order.Notes = dto.Notes;
        order.UpdatedAt = DateTime.UtcNow;

        // Replace order items
        _context.OrderItems.RemoveRange(order.OrderItems);

        decimal total = 0;
        foreach (var item in dto.Items)
        {
            var productExists = await _context.Products.AnyAsync(p => p.Id == item.ProductId);
            if (!productExists)
                return BadRequest(new { message = $"Product {item.ProductId} not found." });

            var lineTotal = item.UnitPriceZAR * item.Quantity + item.BrandingCostZAR;
            total += lineTotal;

            order.OrderItems.Add(new OrderItem
            {
                ProductId = item.ProductId,
                SKU = item.SKU,
                Quantity = item.Quantity,
                UnitPriceZAR = item.UnitPriceZAR,
                TotalPriceZAR = lineTotal,
                BrandingCostZAR = item.BrandingCostZAR
            });
        }

        order.TotalAmountZAR = total;
        await _context.SaveChangesAsync();

        var updated = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.OrderItems).ThenInclude(oi => oi.Product)
            .FirstAsync(o => o.Id == id);

        return Ok(MapToDto(updated));
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
        CustomerId = o.CustomerId,
        CustomerName = o.Customer?.CompanyName ?? string.Empty,
        Status = o.Status,
        OrderDate = o.OrderDate,
        EstimatedDeliveryDate = o.EstimatedDeliveryDate,
        TotalAmountZAR = o.TotalAmountZAR,
        BrandingType = o.BrandingType,
        Notes = o.Notes,
        CreatedAt = o.CreatedAt,
        UpdatedAt = o.UpdatedAt,
        OrderItems = o.OrderItems?.Select(oi => new OrderItemDto
        {
            Id = oi.Id,
            OrderId = oi.OrderId,
            ProductId = oi.ProductId,
            ProductName = oi.Product?.Name ?? string.Empty,
            SKU = oi.SKU,
            Quantity = oi.Quantity,
            UnitPriceZAR = oi.UnitPriceZAR,
            TotalPriceZAR = oi.TotalPriceZAR,
            BrandingCostZAR = oi.BrandingCostZAR
        }).ToList() ?? new()
    };
}
