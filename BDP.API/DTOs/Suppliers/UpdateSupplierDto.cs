using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Suppliers;

public class UpdateSupplierDto
{
    [Required] [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [MaxLength(100)] public string Country { get; set; } = "China";
    public string? Address { get; set; }
    [EmailAddress] public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public bool SuppliesBottles { get; set; }
    public bool SuppliesCustomisation { get; set; }
    public bool IsActive { get; set; } = true;
}
