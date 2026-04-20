using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Suppliers;

public class UpdateSupplierDto
{
    [Required] [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required] [MaxLength(100)] public string Platform { get; set; } = string.Empty;
    [Required] [MaxLength(100)] public string Country { get; set; } = string.Empty;
    [EmailAddress] public string? ContactEmail { get; set; }
    public string? Notes { get; set; }
}
