namespace BDP.API.Models;

public class Product
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
    public bool IsActive { get; set; } = true;
    public string? ShopifyTitle { get; set; }
    public string? ShopifyBodyHtml { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime DateAdded { get; set; } = DateTime.UtcNow;

    // Shipping dimensions (DDP sea freight from China)
    public decimal WeightKg { get; set; }
    public decimal LengthCm { get; set; }
    public decimal WidthCm { get; set; }
    public decimal HeightCm { get; set; }
    public decimal VolumeCBM { get; set; }

    public Supplier Supplier { get; set; } = null!;
    public ICollection<PricingTier> PricingTiers { get; set; } = new List<PricingTier>();
    public ICollection<ProductPricingTier> ProductPricingTiers { get; set; } = new List<ProductPricingTier>();
    public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
}
