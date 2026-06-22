namespace BDP.API.DTOs.Products;

public class CreateVariantDto
{
    public string Size { get; set; } = string.Empty;
    public string BottleColour { get; set; } = string.Empty;
    public string LidColour { get; set; } = string.Empty;
    public string Texture { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public class ProductVariantDto
{
    public int Id { get; set; }
    public string? Size { get; set; }
    public string? BottleColour { get; set; }
    public string? LidColour { get; set; }
    public string? Texture { get; set; }
    public string SKU { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public decimal UnitPriceCNY { get; set; }
    // Actual landed cost per unit in ZAR = (UnitPriceCNY + buffer) × CNY→ZAR.
    public decimal ActualCostPerUnitZAR { get; set; }
    public List<VariantPricingTierDto> PricingTiers { get; set; } = new();
}

public class VariantPricingTierDto
{
    public int Id { get; set; }
    public int Quantity { get; set; }
    public decimal CostCNY { get; set; }
    public decimal CostWithShippingCNY { get; set; }
    public decimal CostWithDutiesCNY { get; set; }
    // NOTE: CostPerUnitZAR historically holds the SALE price per unit (storefront
    // reads it). Kept as-is for compatibility. Use the explicit fields below for
    // the admin cost/profit view.
    public decimal CostPerUnitZAR { get; set; }
    public decimal SalePriceZAR { get; set; }
    public string SKU { get; set; } = string.Empty;

    // ── Admin profitability breakdown (computed) ──────────────────────────────
    public decimal SalePerUnitZAR { get; set; }      // what the customer pays per unit
    public decimal ActualCostPerUnitZAR { get; set; } // what it actually costs us per unit
    public decimal ProfitPerUnitZAR { get; set; }     // sale − cost, per unit
    public decimal TotalCostZAR { get; set; }         // cost × qty
    public decimal TotalSaleZAR { get; set; }         // sale × qty
    public decimal TotalProfitZAR { get; set; }       // profit × qty
    public decimal MarginPercent { get; set; }        // profit / sale × 100
}

public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Link1688 { get; set; }
    public string? Description { get; set; }
    public string? UsageSuitability { get; set; }
    public string MetaTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string MetaKeywords { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public decimal WeightKg { get; set; }
    public decimal LengthCm { get; set; }
    public decimal WidthCm { get; set; }
    public decimal HeightCm { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ProductVariantDto> Variants { get; set; } = new();
    public bool IsActive => Variants.Any(v => v.IsActive);
}
