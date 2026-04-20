namespace BDP.API.Models;

public class ProductPricingTier
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal SalePriceZAR { get; set; }
    public decimal DeliveryCostZAR { get; set; }

    public Product Product { get; set; } = null!;
}
