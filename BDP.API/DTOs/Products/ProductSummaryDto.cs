namespace BDP.API.DTOs.Products;

public class ProductSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string SKUBase { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int SizeML { get; set; }
    public string BottleColour { get; set; } = string.Empty;
    public string LidColour { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
