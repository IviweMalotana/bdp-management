using BDP.API.Data;
using BDP.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/shipping")]
public class StorefrontShippingController : ControllerBase
{
    private readonly YunExpressService _yunExpress;
    private readonly AppDbContext _db;

    public StorefrontShippingController(YunExpressService yunExpress, AppDbContext db)
    {
        _yunExpress = yunExpress;
        _db = db;
    }

    [HttpGet("options")]
    public async Task<IActionResult> GetOptions(
        [FromQuery] string country = "ZA",
        [FromQuery] int weightGrams = 0,
        [FromQuery] int units = 0)
    {
        // If weightGrams not supplied, calculate from units at 250g billing weight each
        if (weightGrams <= 0 && units > 0)
            weightGrams = units * 250;

        if (weightGrams <= 0)
            return BadRequest(new { message = "Provide weightGrams or units." });

        var options = await _yunExpress.GetRatesAsync(country, weightGrams);

        var settings = await _db.ShippingSettings.FindAsync(1);
        var markupPct = settings?.ShippingMarkupPercent ?? 40m;
        foreach (var opt in options)
            opt.PriceZAR = Math.Round(opt.PriceZAR * (1 + markupPct / 100m), 2);

        return Ok(options.Select(o => new
        {
            code = o.Code,
            name = o.Name,
            description = o.Description,
            transitDaysMin = o.TransitDaysMin,
            transitDaysMax = o.TransitDaysMax,
            priceZAR = o.PriceZAR,
            customsIncluded = o.CustomsIncluded,
            carrier = o.Carrier,
            icon = o.Icon
        }));
    }
}
