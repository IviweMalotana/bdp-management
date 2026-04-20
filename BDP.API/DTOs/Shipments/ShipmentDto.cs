namespace BDP.API.DTOs.Shipments;

public class ShipmentDto
{
    public int Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; }
    public DateTime? EstimatedArrival { get; set; }
    public DateTime? ActualArrival { get; set; }
    public string OriginCountry { get; set; } = string.Empty;
    public decimal FreightCostZAR { get; set; }
    public decimal CustomsDutyZAR { get; set; }
    public decimal TotalCostZAR { get; set; }
    public string? Notes { get; set; }
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
