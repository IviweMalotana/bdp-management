namespace BDP.API.DTOs.Products;

public class ProductDetailDto : ProductDto
{
    public List<ProductImageDto> Images { get; set; } = new();
    public List<string> Collections { get; set; } = new();
}

public class ProductImageDto
{
    public int Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string AltText { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsPrimary { get; set; }
}
