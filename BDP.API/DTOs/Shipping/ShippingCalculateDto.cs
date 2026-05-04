namespace BDP.API.DTOs.Shipping;

public class ShippingCalculateRequestDto
{
    public decimal WeightKg { get; set; }
    public decimal VolumeCBM { get; set; }
    public int Quantity { get; set; }
}

public class ShippingCalculateResponseDto
{
    public decimal WeightKg { get; set; }
    public decimal VolumeCBM { get; set; }
    public int Quantity { get; set; }
    public decimal CnyPerCbm { get; set; }
    public decimal CnyPerKg { get; set; }
    public decimal CnyToZarRate { get; set; }
    public decimal TotalShippingZAR { get; set; }
    public decimal PerUnitShippingZAR { get; set; }
}
