namespace BDP.API.DTOs.Products;

public class CalculatePricingResponseDto
{
    public decimal ExchangeRate { get; set; }
    public decimal CostPerUnitZAR { get; set; }
    public List<PricingTierCalculationDto> Tiers { get; set; } = new();
}

public class PricingTierCalculationDto
{
    public int Quantity { get; set; }
    public decimal MarkupPercent { get; set; }
    public decimal SalePricePerUnit { get; set; }
    public decimal TotalSalePrice { get; set; }
    public decimal TotalCostPrice { get; set; }
    public decimal ProfitPerUnit { get; set; }
    public decimal TotalProfit { get; set; }
    public decimal MarginPercent { get; set; }
    public decimal CompareAtPrice { get; set; }
    public string SKU { get; set; } = string.Empty;
}
