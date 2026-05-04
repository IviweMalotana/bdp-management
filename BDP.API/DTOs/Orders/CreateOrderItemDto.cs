using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Orders;

public class CreateOrderItemDto
{
    [Range(1, int.MaxValue)] public int ProductVariantId { get; set; }
    [Range(1, int.MaxValue)] public int PricingTierId { get; set; }
    public int? CustomisationOptionId { get; set; }
    public int? CustomisationPricingTierId { get; set; }
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
    [Range(0, double.MaxValue)] public decimal UnitPriceZAR { get; set; }
    [Range(0, double.MaxValue)] public decimal CustomisationCostZAR { get; set; }
    [Range(0, double.MaxValue)] public decimal ShippingCostZAR { get; set; }
}
