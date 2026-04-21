using BDP.API.Data;
using BDP.API.DTOs.ShippingSettings;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/shipping-settings")]
public class ShippingSettingsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ShippingSettingsController(AppDbContext context) => _context = context;

    // GET /api/shipping-settings
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var settings = await _context.ShippingSettings.FindAsync(1);
        if (settings == null) return NotFound(new { message = "Shipping settings not found." });

        return Ok(new ShippingSettingsDto
        {
            Id = settings.Id,
            CnyPerCbm = settings.CnyPerCbm,
            CnyPerKg = settings.CnyPerKg,
            CnyToZarRate = settings.CnyToZarRate,
            Notes = settings.Notes,
        });
    }

    // PUT /api/shipping-settings
    [HttpPut]
    [Authorize]
    public async Task<IActionResult> Update([FromBody] UpdateShippingSettingsDto dto)
    {
        var settings = await _context.ShippingSettings.FindAsync(1);
        if (settings == null) return NotFound(new { message = "Shipping settings not found." });

        settings.CnyPerCbm = dto.CnyPerCbm;
        settings.CnyPerKg = dto.CnyPerKg;
        settings.CnyToZarRate = dto.CnyToZarRate;
        if (dto.Notes != null) settings.Notes = dto.Notes;

        // Recalculate all ProductPricingTier delivery costs using the new rates
        var tiers = await _context.ProductPricingTiers
            .Include(t => t.Product)
            .ToListAsync();

        foreach (var tier in tiers)
        {
            var p = tier.Product;
            tier.DeliveryCostZAR = Math.Round(
                ShippingCalculator.CalculateShippingZAR(
                    p.WeightKg, p.VolumeCBM, tier.Quantity,
                    settings.CnyPerCbm, settings.CnyPerKg, settings.CnyToZarRate),
                4);
        }

        await _context.SaveChangesAsync();

        return Ok(new ShippingSettingsDto
        {
            Id = settings.Id,
            CnyPerCbm = settings.CnyPerCbm,
            CnyPerKg = settings.CnyPerKg,
            CnyToZarRate = settings.CnyToZarRate,
            Notes = settings.Notes,
        });
    }
}
