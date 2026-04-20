namespace BDP.API.DTOs.Customisation;

public class CustomisationOptionDto
{
    public int Id { get; set; }
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int MinQuantity { get; set; }
    public decimal TotalPriceZAR { get; set; }
    public string? Notes { get; set; }
}
