namespace BDP.API.Models;

public class ProductPricingTier
{
    public int Id { get; set; }
    public int ProductVariantId { get; set; }
    public int Quantity { get; set; }
    public decimal CostCNY { get; set; }
    public decimal CostWithShippingCNY { get; set; }
    public decimal CostWithDutiesCNY { get; set; }
    public decimal CostPerUnitZAR { get; set; }
    public decimal SalePriceZAR { get; set; }
    public string SKU { get; set; } = string.Empty;

    public ProductVariant ProductVariant { get; set; } = null!;
}
