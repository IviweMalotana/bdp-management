namespace BDP.API.Models;

public class CustomisationPricingTier
{
    public int Id { get; set; }
    public int CustomisationOptionId { get; set; }
    public CustomisationOption CustomisationOption { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal CostCNY { get; set; }
    public decimal CostWithShippingCNY { get; set; }
    public decimal CostPerUnitZAR { get; set; }
    public decimal SalePriceZAR { get; set; }
    public string SKU { get; set; } = string.Empty;
}
