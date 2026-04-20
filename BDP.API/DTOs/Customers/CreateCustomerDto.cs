using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Customers;

public class CreateCustomerDto
{
    [Required] [MaxLength(200)] public string CompanyName { get; set; } = string.Empty;
    [Required] [MaxLength(100)] public string ContactName { get; set; } = string.Empty;
    [Required] [EmailAddress]   public string Email { get; set; } = string.Empty;
    [Phone]                     public string? Phone { get; set; }
    [MaxLength(200)]            public string? BrandName { get; set; }
    [MaxLength(100)]            public string Country { get; set; } = "South Africa";
    public string? Notes { get; set; }
}
