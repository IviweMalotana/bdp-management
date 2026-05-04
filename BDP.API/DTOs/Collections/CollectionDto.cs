namespace BDP.API.DTOs.Collections;

public class CollectionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string MetaTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string MetaKeywords { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int ProductCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CollectionDetailDto : CollectionDto
{
    public List<CollectionProductDto> Products { get; set; } = new();
}

public class CollectionProductDto
{
    public int ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int VariantCount { get; set; }
}

public class CreateCollectionDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string MetaTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string MetaKeywords { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

public class UpdateCollectionDto : CreateCollectionDto { }

public class AddProductToCollectionDto
{
    public int ProductId { get; set; }
}
