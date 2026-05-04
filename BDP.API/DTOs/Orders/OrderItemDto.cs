namespace BDP.API.DTOs.Orders;

public class OrderItemDto
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ProductVariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string VariantSku { get; set; } = string.Empty;
    public int PricingTierId { get; set; }
    public int? CustomisationOptionId { get; set; }
    public int? CustomisationPricingTierId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPriceZAR { get; set; }
    public decimal LineTotal { get; set; }
    public decimal CustomisationCostZAR { get; set; }
    public decimal ShippingCostZAR { get; set; }
}
