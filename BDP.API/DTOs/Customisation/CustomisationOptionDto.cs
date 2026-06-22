namespace BDP.API.DTOs.Customisation;

public class CustomisationPricingTierDto
{
    public int Id { get; set; }
    public int Quantity { get; set; }
    public decimal CostCNY { get; set; }
    public decimal CostWithShippingCNY { get; set; }
    public decimal CostPerUnitZAR { get; set; }   // true supplier cost per unit (ZAR)
    public decimal SalePriceZAR { get; set; }
    public string SKU { get; set; } = string.Empty;

    // ── Admin profitability breakdown (computed) ──────────────────────────────
    public decimal SalePerUnitZAR { get; set; }
    public decimal ProfitPerUnitZAR { get; set; }
    public decimal TotalCostZAR { get; set; }
    public decimal TotalSaleZAR { get; set; }
    public decimal TotalProfitZAR { get; set; }
    public decimal MarginPercent { get; set; }
    public bool SalePriceDerived { get; set; }   // true if sale was derived (no stored price)
}

public class CustomisationOptionDto
{
    public int Id { get; set; }
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Link1688 { get; set; }
    public int? MinimumQuantity { get; set; }
    // Customisation adds production time but no shipping weight.
    public int ProductionLeadTimeDays { get; set; } = 7;   // +1 week
    public bool AddsShippingWeight { get; set; } = false;   // never adds kg
    public List<CustomisationPricingTierDto> PricingTiers { get; set; } = new();
}
