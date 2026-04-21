namespace BDP.API.DTOs.ShippingSettings;

public class ShippingSettingsDto
{
    public int Id { get; set; }
    public decimal CnyPerCbm { get; set; }
    public decimal CnyPerKg { get; set; }
    public decimal CnyToZarRate { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public class UpdateShippingSettingsDto
{
    public decimal CnyPerCbm { get; set; }
    public decimal CnyPerKg { get; set; }
    public decimal CnyToZarRate { get; set; }
    public string? Notes { get; set; }
}
