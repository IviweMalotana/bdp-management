namespace BDP.API.Models;

public class Shipment
{
    public int Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public int SupplierId { get; set; }
    public ShipmentStatus Status { get; set; }
    public DateTime OrderDate { get; set; }
    public DateTime? EstimatedArrival { get; set; }
    public DateTime? ActualArrival { get; set; }
    public string OriginCountry { get; set; } = "China";
    public decimal FreightCostZAR { get; set; }
    public decimal CustomsDutyZAR { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Supplier Supplier { get; set; } = null!;
    public ICollection<ShipmentItem> Items { get; set; } = new List<ShipmentItem>();
}
