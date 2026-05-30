using BDP.API.Data;
using BDP.API.DTOs.Shipping;
using BDP.API.DTOs.ShippingSettings;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/shipping")]
[Authorize]
public class ShippingController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ShippingCalculatorService _calculator;

    public ShippingController(AppDbContext context, ShippingCalculatorService calculator)
    {
        _context = context;
        _calculator = calculator;
    }

    [HttpPost("calculate")]
    public async Task<IActionResult> Calculate([FromBody] ShippingCalculateRequestDto dto)
    {
        var (cnyPerCbm, cnyPerKg, cnyToZar) = await _calculator.GetRatesAsync();
        var total = ShippingCalculator.CalculateShippingZAR(
            dto.WeightKg, dto.VolumeCBM, dto.Quantity, cnyPerCbm, cnyPerKg, cnyToZar);
        var perUnit = dto.Quantity > 0 ? total / dto.Quantity : 0;

        return Ok(new ShippingCalculateResponseDto
        {
            WeightKg = dto.WeightKg,
            VolumeCBM = dto.VolumeCBM,
            Quantity = dto.Quantity,
            CnyPerCbm = cnyPerCbm,
            CnyPerKg = cnyPerKg,
            CnyToZarRate = cnyToZar,
            TotalShippingZAR = total,
            PerUnitShippingZAR = perUnit
        });
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var settings = await _context.ShippingSettings.FindAsync(1);
        if (settings == null) return NotFound();
        return Ok(new ShippingSettingsDto
        {
            Id = settings.Id,
            CnyPerCbm = settings.CnyPerCbm,
            CnyPerKg = settings.CnyPerKg,
            CnyToZarRate = settings.CnyToZarRate,
            BufferCNY = settings.BufferCNY,
            ProfitCNY = settings.ProfitCNY,
            UpdatedAt = settings.UpdatedAt
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] ShippingSettingsDto dto)
    {
        var settings = await _context.ShippingSettings.FindAsync(1);
        if (settings == null) return NotFound();

        settings.CnyPerCbm = dto.CnyPerCbm;
        settings.CnyPerKg = dto.CnyPerKg;
        settings.CnyToZarRate = dto.CnyToZarRate;
        settings.BufferCNY = dto.BufferCNY > 0 ? dto.BufferCNY : settings.BufferCNY;
        settings.ProfitCNY = dto.ProfitCNY > 0 ? dto.ProfitCNY : settings.ProfitCNY;
        settings.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(new ShippingSettingsDto
        {
            Id = settings.Id,
            CnyPerCbm = settings.CnyPerCbm,
            CnyPerKg = settings.CnyPerKg,
            CnyToZarRate = settings.CnyToZarRate,
            BufferCNY = settings.BufferCNY,
            ProfitCNY = settings.ProfitCNY,
            UpdatedAt = settings.UpdatedAt
        });
    }
}
