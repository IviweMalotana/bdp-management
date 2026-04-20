using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Suppliers;

public class CreateSupplierDto
{
    [Required] [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [MaxLength(100)] public string Country { get; set; } = "China";
    [EmailAddress] public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? Website { get; set; }
    public int LeadTimeDays { get; set; }
    public int MinOrderQuantity { get; set; }
    public bool OffersCustomisation { get; set; }
    public string? Notes { get; set; }
}
