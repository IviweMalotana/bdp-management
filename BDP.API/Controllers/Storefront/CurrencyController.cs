using BDP.API.Data;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers.Storefront;

[ApiController]
public class CurrencyController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly CurrencyService _currency;

    public CurrencyController(AppDbContext db, CurrencyService currency)
    {
        _db = db;
        _currency = currency;
    }

    // GET /api/storefront/currencies
    [HttpGet("api/storefront/currencies")]
    public async Task<IActionResult> GetCurrencies()
    {
        var rates = await _db.CurrencyRates
            .Where(r => r.IsActive)
            .OrderBy(r => r.Code)
            .Select(r => new
            {
                r.Code,
                r.Symbol,
                r.Name,
                r.Flag,
                r.Region,
                r.RateFromZAR,
                r.LastUpdated,
            })
            .ToListAsync();

        return Ok(rates);
    }

    // POST /api/admin/currencies/refresh
    [HttpPost("api/admin/currencies/refresh")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> RefreshRates()
    {
        await _currency.RefreshRatesAsync();

        var rates = await _db.CurrencyRates
            .Where(r => r.IsActive)
            .OrderBy(r => r.Code)
            .Select(r => new
            {
                r.Code,
                r.Symbol,
                r.Name,
                r.Flag,
                r.Region,
                r.RateFromZAR,
                r.LastUpdated,
            })
            .ToListAsync();

        return Ok(rates);
    }
}
