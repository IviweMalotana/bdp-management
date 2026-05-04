namespace BDP.API.DTOs.Products;

public class ProductSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int VariantCount { get; set; }
}
