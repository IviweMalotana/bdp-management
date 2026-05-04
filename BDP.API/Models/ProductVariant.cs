namespace BDP.API.Models;

public class ProductVariant
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string Size { get; set; } = string.Empty;
    public string BottleColour { get; set; } = string.Empty;
    public string LidColour { get; set; } = string.Empty;
    public string Texture { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public List<ProductPricingTier> PricingTiers { get; set; } = new();
}
