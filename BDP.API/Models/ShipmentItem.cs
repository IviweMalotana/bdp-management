namespace BDP.API.Models;

public class ShipmentItem
{
    public int Id { get; set; }
    public int ShipmentId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal CostPerUnitZAR { get; set; }
    public decimal TotalCostZAR { get; set; }

    public Shipment Shipment { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
