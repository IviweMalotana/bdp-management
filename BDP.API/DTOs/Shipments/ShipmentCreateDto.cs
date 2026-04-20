using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Shipments;

public class ShipmentCreateDto
{
    [Required] public int SupplierId { get; set; }
    [Required] public DateTime OrderDate { get; set; }
    public DateTime? EstimatedArrival { get; set; }
    public string OriginCountry { get; set; } = "China";
    public decimal FreightCostZAR { get; set; }
    public decimal CustomsDutyZAR { get; set; }
    public string? Notes { get; set; }
    [Required] public List<ShipmentItemCreateDto> Items { get; set; } = new();
}

public class ShipmentItemCreateDto
{
    [Required] public int ProductId { get; set; }
    [Required] public int Quantity { get; set; }
    [Required] public decimal CostPerUnitZAR { get; set; }
}
