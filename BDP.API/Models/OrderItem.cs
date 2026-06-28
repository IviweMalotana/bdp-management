namespace BDP.API.Models;

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ProductVariantId { get; set; }
    public int PricingTierId { get; set; }
    public int? CustomisationOptionId { get; set; }
    // JSON array of customisation option IDs when a line has more than one add-on.
    // Falls back to CustomisationOptionId when null. CustomisationCostZAR holds the sum.
    public string? CustomisationOptionIdsJson { get; set; }
    public int? CustomisationPricingTierId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPriceZAR { get; set; }
    public decimal LineTotal { get; set; }
    public decimal CustomisationCostZAR { get; set; }
    public decimal ShippingCostZAR { get; set; }

    public Order Order { get; set; } = null!;
    public ProductVariant ProductVariant { get; set; } = null!;
    public ProductPricingTier PricingTier { get; set; } = null!;
    public CustomisationOption? CustomisationOption { get; set; }
    public CustomisationPricingTier? CustomisationPricingTier { get; set; }
}
