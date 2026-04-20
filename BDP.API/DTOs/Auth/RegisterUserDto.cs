using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Auth;

public class RegisterUserDto
{
    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(Admin|Manager)$", ErrorMessage = "Role must be 'Admin' or 'Manager'.")]
    public string Role { get; set; } = string.Empty;
}
