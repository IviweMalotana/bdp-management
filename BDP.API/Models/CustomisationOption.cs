namespace BDP.API.Models;

public class CustomisationOption
{
    public int Id { get; set; }
    public int SupplierId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? Link1688 { get; set; }
    public int MinimumQuantity { get; set; }

    public Supplier Supplier { get; set; } = null!;
    public List<CustomisationPricingTier> PricingTiers { get; set; } = new();
}
