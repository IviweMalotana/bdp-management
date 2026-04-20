namespace BDP.API.DTOs.Suppliers;

public class SupplierDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? Website { get; set; }
    public int LeadTimeDays { get; set; }
    public int MinOrderQuantity { get; set; }
    public bool OffersCustomisation { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public int ProductCount { get; set; }
    public int CustomisationOptionCount { get; set; }
}
