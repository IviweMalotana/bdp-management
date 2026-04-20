namespace BDP.API.DTOs.Orders;

public class OrderStatsDto
{
    public int TotalOrders { get; set; }
    public decimal RevenueThisMonth { get; set; }
    public List<OrderStatusCountDto> OrdersByStatus { get; set; } = new();
}

public class OrderStatusCountDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}
