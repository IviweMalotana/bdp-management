namespace BDP.API.DTOs.Products;

public class ProductPricingTierDto
{
    public int Id { get; set; }
    public int Quantity { get; set; }
    public decimal SalePriceZAR { get; set; }
    public decimal DeliveryCostZAR { get; set; }
    public decimal? SilkScreenLogoZAR { get; set; }
    public decimal? HotStampingLogoZAR { get; set; }
}
