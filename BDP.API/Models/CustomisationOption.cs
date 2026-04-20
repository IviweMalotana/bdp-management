namespace BDP.API.Models;

public class CustomisationOption
{
    public int Id { get; set; }
    public int SupplierId { get; set; }
    public CustomisationType Type { get; set; }
    public int MinQuantity { get; set; }
    public decimal TotalPriceZAR { get; set; }
    public string? Notes { get; set; }

    public Supplier Supplier { get; set; } = null!;
}
