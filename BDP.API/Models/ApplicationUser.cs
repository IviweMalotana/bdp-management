using Microsoft.AspNetCore.Identity;

namespace BDP.API.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string AccountType { get; set; } = "B2C";
    public string B2BStatus { get; set; } = "NA";
    public int? B2BClientId { get; set; }
    public string? Phone { get; set; }
}
