using BDP.API.Data;
using BDP.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/me")]
[Authorize]
public class StorefrontMeController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly AppDbContext _db;

    public StorefrontMeController(UserManager<ApplicationUser> users, AppDbContext db)
    {
        _users = users;
        _db = db;
    }

    private async Task<(ApplicationUser? user, Client? client)> LoadUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return (null, null);

        var user = await _users.FindByIdAsync(userId);
        if (user == null) return (null, null);

        Client? client = null;
        if (user.B2BClientId.HasValue)
            client = await _db.Clients.FirstOrDefaultAsync(c => c.Id == user.B2BClientId.Value);

        return (user, client);
    }

    private object MePayload(ApplicationUser user, Client? client) => new
    {
        userId = user.Id,
        email = user.Email,
        firstName = user.FirstName,
        lastName = user.LastName,
        phone = user.Phone,
        accountType = user.AccountType,
        b2bStatus = user.B2BStatus,
        client = client == null ? null : (object)new
        {
            id = client.Id,
            companyName = client.CompanyName,
            vatNumber = client.VatNumber,
            paymentTermsDays = client.PaymentTermsDays,
            creditLimit = client.CreditLimit
        }
    };

    [HttpGet]
    public async Task<IActionResult> GetMe()
    {
        var (user, client) = await LoadUser();
        if (user == null) return Unauthorized();
        return Ok(MePayload(user, client));
    }

    public record B2BApplyRequest(
        string CompanyName,
        string? TradingName,
        string? CompanyRegistrationNumber,
        string? VatNumber,
        string ContactPersonName,
        string? ContactPhone,
        string BillingAddress,
        string? ShippingAddress,
        string Industry,
        int RequestedPaymentTermsDays
    );

    [HttpPost("b2b/apply")]
    public async Task<IActionResult> ApplyForB2B([FromBody] B2BApplyRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();

        var user = await _users.FindByIdAsync(userId);
        if (user == null) return Unauthorized();

        if (user.B2BClientId.HasValue || user.B2BStatus != "NA")
            return Conflict(new { message = "A B2B application already exists for this account." });

        var client = new Client
        {
            CompanyName = req.CompanyName,
            TradingName = req.TradingName,
            CompanyRegistrationNumber = req.CompanyRegistrationNumber,
            VatNumber = req.VatNumber,
            ContactPersonName = req.ContactPersonName,
            ContactEmail = user.Email!,
            ContactPhone = req.ContactPhone,
            BillingAddress = req.BillingAddress,
            ShippingAddress = req.ShippingAddress,
            Industry = req.Industry,
            PaymentTermsDays = req.RequestedPaymentTermsDays,
            CreditLimit = 0,
            IsActive = false
        };
        _db.Clients.Add(client);
        await _db.SaveChangesAsync();

        user.AccountType = "B2B";
        user.B2BStatus = "Pending";
        user.B2BClientId = client.Id;
        await _users.UpdateAsync(user);

        return Ok(MePayload(user, client));
    }
}
