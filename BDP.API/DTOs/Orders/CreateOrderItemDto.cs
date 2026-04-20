using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Orders;

public class CreateOrderItemDto
{
    [Range(1, int.MaxValue)]    public int ProductId { get; set; }
    [Required] [MaxLength(50)]  public string SKU { get; set; } = string.Empty;
    [Range(1, int.MaxValue)]    public int Quantity { get; set; }
    [Range(0, double.MaxValue)] public decimal UnitPriceZAR { get; set; }
    [Range(0, double.MaxValue)] public decimal BrandingCostZAR { get; set; }
}
