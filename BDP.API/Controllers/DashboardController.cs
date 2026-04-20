using BDP.API.Data;
using BDP.API.DTOs.Dashboard;
using BDP.API.DTOs.Orders;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context) => _context = context;

    // GET /api/dashboard/summary
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var activeStatuses = new[] { "Pending", "Confirmed", "In Production", "Shipped" };

        var totalProducts = await _context.Products.CountAsync(p => p.IsActive);
        var totalActiveOrders = await _context.Orders.CountAsync(o => activeStatuses.Contains(o.Status));
        var totalCustomers = await _context.Customers.CountAsync();

        var revenueThisMonth = await _context.Orders
            .Where(o => o.OrderDate >= startOfMonth)
            .SumAsync(o => (decimal?)o.TotalAmountZAR) ?? 0;

        var ordersThisMonth = await _context.Orders
            .CountAsync(o => o.OrderDate >= startOfMonth);

        var lowStockCount = await _context.InventoryItems
            .CountAsync(ii => ii.Location == "Cape Town" && ii.OnHandStock == 0);

        var ordersByStatus = await _context.Orders
            .GroupBy(o => o.Status)
            .Select(g => new OrderStatusCountDto { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        var recentOrders = await _context.Orders
            .Include(o => o.Customer)
            .OrderByDescending(o => o.OrderDate)
            .Take(5)
            .Select(o => new RecentOrderDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                CustomerName = o.Customer!.CompanyName,
                TotalAmountZAR = o.TotalAmountZAR,
                Status = o.Status,
                OrderDate = o.OrderDate
            })
            .ToListAsync();

        return Ok(new DashboardSummaryDto
        {
            TotalProducts = totalProducts,
            TotalActiveOrders = totalActiveOrders,
            TotalCustomers = totalCustomers,
            RevenueThisMonth = revenueThisMonth,
            OrdersThisMonth = ordersThisMonth,
            LowStockCount = lowStockCount,
            OrdersByStatus = ordersByStatus,
            RecentOrders = recentOrders
        });
    }
}
