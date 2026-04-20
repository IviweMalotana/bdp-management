namespace BDP.API.Models;

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPriceZAR { get; set; }
    public decimal TotalPriceZAR { get; set; }
    public decimal BrandingCostZAR { get; set; } = 0;

    public Order Order { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
