namespace BDP.API.DTOs.Products;

/// <summary>Request body for saving a product image's logo print area (JSON blob or null to clear).</summary>
public class SetPrintAreaDto
{
    public string? PrintArea { get; set; }
}
