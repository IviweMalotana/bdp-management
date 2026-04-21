namespace BDP.API.DTOs.Products;

public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SKUBase { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int SizeML { get; set; }
    public string BottleColour { get; set; } = string.Empty;
    public string LidColour { get; set; } = string.Empty;
    public string Texture { get; set; } = string.Empty;
    public decimal CostCNY { get; set; }
    public decimal CostWithShippingCNY { get; set; }
    public decimal CostPerUnitZAR { get; set; }
    public string? SupplierLink { get; set; }
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? ShopifyTitle { get; set; }
    public string? ShopifyBodyHtml { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime DateAdded { get; set; }
    public decimal WeightKg { get; set; }
    public decimal LengthCm { get; set; }
    public decimal WidthCm { get; set; }
    public decimal HeightCm { get; set; }
    public decimal VolumeCBM { get; set; }
    public List<PricingTierDto> PricingTiers { get; set; } = new();
}
