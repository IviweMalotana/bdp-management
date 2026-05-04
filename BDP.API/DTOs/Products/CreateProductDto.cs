using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Products;

public class CreateProductDto
{
    [Required] [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required] [MaxLength(100)] public string Category { get; set; } = string.Empty;
    public string? Link1688 { get; set; }
    public string? Description { get; set; }
    public string? UsageSuitability { get; set; }
    [MaxLength(200)] public string MetaTitle { get; set; } = string.Empty;
    [MaxLength(300)] public string MetaDescription { get; set; } = string.Empty;
    [MaxLength(500)] public string MetaKeywords { get; set; } = string.Empty;
    [Required] [MaxLength(200)] public string Slug { get; set; } = string.Empty;
    [Range(1, int.MaxValue)] public int SupplierId { get; set; }
    public decimal WeightKg { get; set; }
    public decimal LengthCm { get; set; }
    public decimal WidthCm { get; set; }
    public decimal HeightCm { get; set; }
}
