using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Products;

public class UpdateProductDto
{
    [Required] [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required] [MaxLength(50)]  public string SKUBase { get; set; } = string.Empty;
    [Required] [MaxLength(100)] public string Category { get; set; } = string.Empty;
    [Range(1, int.MaxValue)]    public int SizeML { get; set; }
    [Required] [MaxLength(50)]  public string BottleColour { get; set; } = string.Empty;
    [Required] [MaxLength(50)]  public string LidColour { get; set; } = string.Empty;
    [Required] [MaxLength(50)]  public string Texture { get; set; } = string.Empty;
    public decimal CostCNY { get; set; }
    public decimal CostWithShippingCNY { get; set; }
    public decimal CostPerUnitZAR { get; set; }
    public string? SupplierLink { get; set; }
    [Range(1, int.MaxValue)] public int SupplierId { get; set; }
    public bool IsActive { get; set; } = true;
    public string? ShopifyTitle { get; set; }
    public string? ShopifyBodyHtml { get; set; }
    public decimal WeightKg { get; set; }
    public decimal LengthCm { get; set; }
    public decimal WidthCm { get; set; }
    public decimal HeightCm { get; set; }
}
