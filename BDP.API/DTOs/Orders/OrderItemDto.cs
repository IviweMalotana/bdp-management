namespace BDP.API.DTOs.Orders;

public class OrderItemDto
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPriceZAR { get; set; }
    public decimal TotalPriceZAR { get; set; }
    public decimal BrandingCostZAR { get; set; }
}
