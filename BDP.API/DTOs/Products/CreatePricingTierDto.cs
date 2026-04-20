using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Products;

public class CreatePricingTierDto
{
    [Required] public string SKU { get; set; } = string.Empty;
    [Range(1, int.MaxValue)] public int Quantity { get; set; }
    public decimal MarkupPercent { get; set; }
    public decimal SalePricePerUnit { get; set; }
    public decimal TotalSalePrice { get; set; }
    public decimal TotalCostPrice { get; set; }
    public decimal ProfitPerUnit { get; set; }
    public decimal TotalProfit { get; set; }
    public decimal MarginPercent { get; set; }
    public decimal? LogoSilkScreen { get; set; }
    public decimal? LogoHotStamping { get; set; }
    public decimal DeliveryCostZAR { get; set; }
    public decimal CompareAtPrice { get; set; }
}
