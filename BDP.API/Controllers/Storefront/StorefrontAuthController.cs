using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/auth")]
public class StorefrontAuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly SignInManager<ApplicationUser> _signIn;
    private readonly JwtService _jwt;

    public StorefrontAuthController(
        UserManager<ApplicationUser> users,
        SignInManager<ApplicationUser> signIn,
        JwtService jwt)
    {
        _users = users;
        _signIn = signIn;
        _jwt = jwt;
    }

    public record RegisterRequest(string Email, string Password, string FirstName, string LastName, string? Phone);

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        var existing = await _users.FindByEmailAsync(req.Email);
        if (existing != null)
            return BadRequest(new { message = "An account with this email already exists." });

        var user = new ApplicationUser
        {
            UserName = req.Email,
            Email = req.Email,
            FirstName = req.FirstName,
            LastName = req.LastName,
            Phone = req.Phone,
            Role = "Customer",
            AccountType = "B2C",
            B2BStatus = "NA"
        };

        var result = await _users.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        var (token, expiresAt) = _jwt.GenerateToken(user);
        return Ok(new { token, expiresAt, userId = user.Id, firstName = user.FirstName, email = user.Email });
    }

    public record LoginRequest(string Email, string Password);

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await _users.FindByEmailAsync(req.Email);
        if (user == null)
            return Unauthorized(new { message = "Invalid email or password." });

        var result = await _signIn.CheckPasswordSignInAsync(user, req.Password, false);
        if (!result.Succeeded)
            return Unauthorized(new { message = "Invalid email or password." });

        var (token, expiresAt) = _jwt.GenerateToken(user);
        return Ok(new { token, expiresAt, userId = user.Id, firstName = user.FirstName, email = user.Email, accountType = user.AccountType });
    }
}
