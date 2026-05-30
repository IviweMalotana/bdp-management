namespace BDP.API.DTOs.ShippingSettings;

public class ShippingSettingsDto
{
    public int Id { get; set; }
    public decimal CnyPerCbm { get; set; }
    public decimal CnyPerKg { get; set; }
    public decimal CnyToZarRate { get; set; }
    public decimal BufferCNY { get; set; }
    public decimal ProfitCNY { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class UpdateShippingSettingsDto
{
    public decimal CnyPerCbm { get; set; }
    public decimal CnyPerKg { get; set; }
    public decimal CnyToZarRate { get; set; }
    public decimal? BufferCNY { get; set; }
    public decimal? ProfitCNY { get; set; }
}
