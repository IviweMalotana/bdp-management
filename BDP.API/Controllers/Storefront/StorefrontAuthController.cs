using BDP.API.Data;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/auth")]
public class StorefrontAuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly SignInManager<ApplicationUser> _signIn;
    private readonly JwtService _jwt;
    private readonly AppDbContext _db;

    public StorefrontAuthController(
        UserManager<ApplicationUser> users,
        SignInManager<ApplicationUser> signIn,
        JwtService jwt,
        AppDbContext db)
    {
        _users = users;
        _signIn = signIn;
        _jwt = jwt;
        _db = db;
    }

    public record BusinessRegisterBlock(
        string CompanyName,
        string? TradingName,
        string? CompanyRegistrationNumber,
        string? VatNumber,
        string ContactPersonName,
        string? ContactPhone,
        string BillingAddress,
        string? ShippingAddress,
        string Industry,
        // Payment terms removed (customers pay upfront) — optional/ignored for compatibility.
        int RequestedPaymentTermsDays = 0
    );

    public record RegisterRequest(
        string Email,
        string Password,
        string FirstName,
        string LastName,
        string? Phone,
        BusinessRegisterBlock? Business
    );

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

        if (req.Business is null)
        {
            var result = await _users.CreateAsync(user, req.Password);
            if (!result.Succeeded)
                return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

            var (token, expiresAt) = _jwt.GenerateToken(user);
            return Ok(new
            {
                token,
                expiresAt,
                userId = user.Id,
                firstName = user.FirstName,
                email = user.Email,
                accountType = user.AccountType,
                b2bStatus = user.B2BStatus
            });
        }

        // B2B registration — wrap in a transaction
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var result = await _users.CreateAsync(user, req.Password);
            if (!result.Succeeded)
                return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

            var b = req.Business;
            var client = new Client
            {
                CompanyName = b.CompanyName,
                TradingName = b.TradingName,
                CompanyRegistrationNumber = b.CompanyRegistrationNumber,
                VatNumber = b.VatNumber,
                ContactPersonName = b.ContactPersonName,
                ContactEmail = user.Email!,
                ContactPhone = b.ContactPhone,
                BillingAddress = b.BillingAddress,
                ShippingAddress = b.ShippingAddress,
                Industry = b.Industry,
                PaymentTermsDays = b.RequestedPaymentTermsDays,
                CreditLimit = 0,
                IsActive = false
            };
            _db.Clients.Add(client);
            await _db.SaveChangesAsync();

            user.AccountType = "B2B";
            user.B2BStatus = "Pending";
            user.B2BClientId = client.Id;
            await _users.UpdateAsync(user);

            await tx.CommitAsync();

            var (token, expiresAt) = _jwt.GenerateToken(user);
            return Ok(new
            {
                token,
                expiresAt,
                userId = user.Id,
                firstName = user.FirstName,
                email = user.Email,
                accountType = user.AccountType,
                b2bStatus = user.B2BStatus
            });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
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
        return Ok(new
        {
            token,
            expiresAt,
            userId = user.Id,
            firstName = user.FirstName,
            email = user.Email,
            accountType = user.AccountType,
            b2bStatus = user.B2BStatus
        });
    }
}
