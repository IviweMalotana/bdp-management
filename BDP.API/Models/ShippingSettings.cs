namespace BDP.API.Models;

public class ShippingSettings
{
    public int Id { get; set; } = 1;
    public decimal CnyPerCbm { get; set; } = 2000m;
    public decimal CnyPerKg { get; set; } = 10m;
    public decimal CnyToZarRate { get; set; } = 2.40m;
    public decimal BufferCNY { get; set; } = 3.00m;   // shipping + fees buffer per unit
    public decimal ProfitCNY { get; set; } = 1.00m;   // margin per unit
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
