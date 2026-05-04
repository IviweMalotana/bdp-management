namespace BDP.API.Models;

public class Collection
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string MetaTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string MetaKeywords { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public List<ProductCollection> ProductCollections { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ProductCollection
{
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public int CollectionId { get; set; }
    public Collection Collection { get; set; } = null!;
}
