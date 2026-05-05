using BDP.API.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace BDP.API.Services;

public class JwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config)
    {
        _config = config;
    }

    public (string token, DateTime expiresAt) GenerateToken(ApplicationUser user)
    {
        var secret =
            (Environment.GetEnvironmentVariable("JWT_SECRET") is { Length: > 0 } envSecret ? envSecret : null)
            ?? (_config["JWT:Secret"] is { Length: > 0 } cfgSecret ? cfgSecret : null)
            ?? throw new InvalidOperationException("JWT secret not configured. Set JWT_SECRET env var (production) or JWT:Secret in appsettings.Development.json (local).");
        var issuer = _config["JWT:Issuer"] ?? throw new InvalidOperationException("JWT:Issuer not configured");
        var audience = _config["JWT:Audience"] ?? throw new InvalidOperationException("JWT:Audience not configured");
        var expiryHours = int.Parse(_config["JWT:ExpiryHours"] ?? "8");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTime.UtcNow.AddHours(expiryHours);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("firstName", user.FirstName),
            new Claim("lastName", user.LastName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(ClaimTypes.NameIdentifier, user.Id)
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
