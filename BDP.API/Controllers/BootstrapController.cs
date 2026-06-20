using BDP.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace BDP.API.Controllers;

/// <summary>
/// One-time endpoint to create the admin user on a fresh database.
/// Protected by BOOTSTRAP_SECRET env var — set it in Railway, hit the endpoint once, then remove it.
/// </summary>
[ApiController]
[Route("api/bootstrap")]
public class BootstrapController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly RoleManager<IdentityRole> _roles;
    private readonly IConfiguration _config;

    public BootstrapController(
        UserManager<ApplicationUser> users,
        RoleManager<IdentityRole> roles,
        IConfiguration config)
    {
        _users = users;
        _roles = roles;
        _config = config;
    }

    [HttpPost]
    public async Task<IActionResult> Bootstrap([FromQuery] string secret)
    {
        var expected = Environment.GetEnvironmentVariable("BOOTSTRAP_SECRET")
                    ?? _config["BootstrapSecret"];

        if (string.IsNullOrWhiteSpace(expected))
            return BadRequest(new { message = "BOOTSTRAP_SECRET is not configured on the server." });

        if (secret != expected)
            return Unauthorized(new { message = "Invalid secret." });

        // Ensure roles exist
        foreach (var role in new[] { "Admin", "Manager" })
        {
            if (!await _roles.RoleExistsAsync(role))
                await _roles.CreateAsync(new IdentityRole(role));
        }

        const string email = "admin@bdp.com";
        const string password = "Admin@123!";

        var existing = await _users.FindByEmailAsync(email);
        if (existing != null)
        {
            // Reset password in case it was changed
            var token = await _users.GeneratePasswordResetTokenAsync(existing);
            await _users.ResetPasswordAsync(existing, token, password);
            if (!await _users.IsInRoleAsync(existing, "Admin"))
                await _users.AddToRoleAsync(existing, "Admin");

            return Ok(new { message = "Admin user already exists — password reset to default.", email, password });
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FirstName = "Admin",
            LastName = "BDP",
            Role = "Admin",
        };

        var result = await _users.CreateAsync(user, password);
        if (!result.Succeeded)
            return BadRequest(new { message = "Failed to create user.", errors = result.Errors.Select(e => e.Description) });

        await _users.AddToRoleAsync(user, "Admin");
        return Ok(new { message = "Admin user created successfully.", email, password });
    }
}
