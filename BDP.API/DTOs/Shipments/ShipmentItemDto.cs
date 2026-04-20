namespace BDP.API.DTOs.Shipments;

public class ShipmentItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal CostPerUnitZAR { get; set; }
    public decimal TotalCostZAR { get; set; }
}
