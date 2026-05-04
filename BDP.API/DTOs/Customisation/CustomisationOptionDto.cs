namespace BDP.API.DTOs.Customisation;

public class CustomisationPricingTierDto
{
    public int Id { get; set; }
    public int Quantity { get; set; }
    public decimal CostCNY { get; set; }
    public decimal CostWithShippingCNY { get; set; }
    public decimal CostPerUnitZAR { get; set; }
    public decimal SalePriceZAR { get; set; }
    public string SKU { get; set; } = string.Empty;
}

public class CustomisationOptionDto
{
    public int Id { get; set; }
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Link1688 { get; set; }
    public int MinimumQuantity { get; set; }
    public List<CustomisationPricingTierDto> PricingTiers { get; set; } = new();
}
