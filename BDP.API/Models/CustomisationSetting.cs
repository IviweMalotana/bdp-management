namespace BDP.API.Models;

public class CustomisationSetting
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;        // "SilkScreen" | "HotStamping" | "ColourChange"
    public decimal PricePerUnitZAR { get; set; }
    public bool IsActive { get; set; } = true;
    public int DefaultMinimumQuantity { get; set; } = 1000;
}
