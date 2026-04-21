namespace BDP.API.DTOs.Shipments;

public class ShipmentUpdateDto
{
    public string? Status { get; set; }
    public DateTime? EstimatedArrival { get; set; }
    public DateTime? ActualArrival { get; set; }
    public decimal SeaFreightCostZAR { get; set; }
    public decimal CustomsDutyZAR { get; set; }
    public string? DestinationAddress { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? Notes { get; set; }
}

public class ShipmentStatusDto
{
    public string Status { get; set; } = string.Empty;
}
