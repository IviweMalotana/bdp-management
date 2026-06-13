namespace BDP.API.Models;

public class CustomisationSetting
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;        // "SilkScreen" | "HotStamping" | "ColourChange"
    public decimal PricePerUnitZAR { get; set; }      // sale price at MOQ (legacy / fallback)
    public decimal CostPerUnitCNY { get; set; }        // your actual cost in CNY (0 for ColourChange)
    public bool IsActive { get; set; } = true;
    public int DefaultMinimumQuantity { get; set; } = 1000;
}
