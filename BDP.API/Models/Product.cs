namespace BDP.API.Models;

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Link1688 { get; set; }
    public string? Description { get; set; }
    public string? UsageSuitability { get; set; }
    public string MetaTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string MetaKeywords { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int SupplierId { get; set; }
    public decimal WeightKg { get; set; }
    public decimal LengthCm { get; set; }
    public decimal WidthCm { get; set; }
    public decimal HeightCm { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Supplier Supplier { get; set; } = null!;
    public List<ProductVariant> Variants { get; set; } = new();
    public List<ProductImage> Images { get; set; } = new();
    public List<ProductCollection> ProductCollections { get; set; } = new();
}
