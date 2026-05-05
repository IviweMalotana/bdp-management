using BDP.API.Data;
using BDP.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/shipping-rates")]
[Authorize]
public class ShippingRatesController : ControllerBase
{
    private readonly AppDbContext _context;
    public ShippingRatesController(AppDbContext context) => _context = context;

    // GET /api/shipping-rates
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var rates = await _context.ShippingRates
            .OrderBy(r => r.Country).ThenBy(r => r.ShippingType)
            .Select(r => ToDto(r))
            .ToListAsync();
        return Ok(rates);
    }

    // GET /api/shipping-rates/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var r = await _context.ShippingRates.FindAsync(id);
        return r == null ? NotFound() : Ok(ToDto(r));
    }

    // POST /api/shipping-rates
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] ShippingRateDto dto)
    {
        if (await _context.ShippingRates.AnyAsync(r => r.Country == dto.Country && r.ShippingType == dto.ShippingType))
            return Conflict(new { message = $"A rate for {dto.Country} / {dto.ShippingType} already exists." });

        var rate = FromDto(dto);
        rate.UpdatedAt = DateTime.UtcNow;
        _context.ShippingRates.Add(rate);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = rate.Id }, ToDto(rate));
    }

    // PUT /api/shipping-rates/{id}
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] ShippingRateDto dto)
    {
        var rate = await _context.ShippingRates.FindAsync(id);
        if (rate == null) return NotFound();

        // Ensure no duplicate country+type (excluding self)
        if (await _context.ShippingRates.AnyAsync(r => r.Id != id && r.Country == dto.Country && r.ShippingType == dto.ShippingType))
            return Conflict(new { message = $"A rate for {dto.Country} / {dto.ShippingType} already exists." });

        rate.Country               = dto.Country;
        rate.ShippingType          = dto.ShippingType;
        rate.RatePerKg             = dto.RatePerKg;
        rate.RatePerCbm            = dto.RatePerCbm;
        rate.FuelSurchargePercent  = dto.FuelSurchargePercent;
        rate.DutyRatePercent       = dto.DutyRatePercent;
        rate.VatRatePercent        = dto.VatRatePercent;
        rate.HandlingFeeZAR        = dto.HandlingFeeZAR;
        rate.MinimumChargeZAR      = dto.MinimumChargeZAR;
        rate.ExchangeRateCNYToZAR  = dto.ExchangeRateCNYToZAR;
        rate.EstimatedTransitDays  = dto.EstimatedTransitDays;
        rate.IsActive              = dto.IsActive;
        rate.Notes                 = dto.Notes;
        rate.UpdatedAt             = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(ToDto(rate));
    }

    // DELETE /api/shipping-rates/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var rate = await _context.ShippingRates.FindAsync(id);
        if (rate == null) return NotFound();
        _context.ShippingRates.Remove(rate);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/shipping-rates/calculate
    [HttpPost("calculate")]
    public async Task<IActionResult> Calculate([FromBody] ShippingCalcRequestDto req)
    {
        var rate = await _context.ShippingRates
            .FirstOrDefaultAsync(r => r.Country == req.Country && r.ShippingType == req.ShippingType && r.IsActive);
        if (rate == null)
            return NotFound(new { message = $"No active rate found for {req.Country} / {req.ShippingType}" });

        var result = ComputeRate(rate, req.WeightKg, req.VolumeCBM);
        return Ok(result);
    }

    // ── Formula ────────────────────────────────────────────────────────────────
    public static ShippingCalcResultDto ComputeRate(ShippingRate rate, decimal weightKg, decimal volumeCBM)
    {
        // Base cost in CNY
        decimal baseCNY = (weightKg * rate.RatePerKg) + (volumeCBM * rate.RatePerCbm);

        // Apply fuel surcharge
        decimal withSurchargeCNY = baseCNY * (1 + rate.FuelSurchargePercent / 100m);

        // Apply duty + VAT (DDP types only — already embedded in rate for DDU)
        bool isDDP = rate.ShippingType.EndsWith("DDP", StringComparison.OrdinalIgnoreCase);
        decimal withDutiesCNY = isDDP
            ? withSurchargeCNY * (1 + rate.DutyRatePercent / 100m) * (1 + rate.VatRatePercent / 100m)
            : withSurchargeCNY;

        // Convert to ZAR and add flat handling
        decimal rawZAR = (withDutiesCNY * rate.ExchangeRateCNYToZAR) + rate.HandlingFeeZAR;

        // Apply minimum, then round UP to nearest rand
        decimal finalZAR = Math.Ceiling(Math.Max(rawZAR, rate.MinimumChargeZAR));

        return new ShippingCalcResultDto
        {
            Country           = rate.Country,
            ShippingType      = rate.ShippingType,
            WeightKg          = weightKg,
            VolumeCBM         = volumeCBM,
            BaseCostCNY       = Math.Round(baseCNY, 2),
            WithSurchargeCNY  = Math.Round(withSurchargeCNY, 2),
            WithDutiesCNY     = Math.Round(withDutiesCNY, 2),
            RawZAR            = Math.Round(rawZAR, 2),
            TotalZAR          = finalZAR,
            MinimumApplied    = rawZAR < rate.MinimumChargeZAR,
            EstimatedTransitDays = rate.EstimatedTransitDays,
        };
    }

    // ── Mapping helpers ────────────────────────────────────────────────────────
    private static ShippingRateDto ToDto(ShippingRate r) => new()
    {
        Id                   = r.Id,
        Country              = r.Country,
        ShippingType         = r.ShippingType,
        RatePerKg            = r.RatePerKg,
        RatePerCbm           = r.RatePerCbm,
        FuelSurchargePercent = r.FuelSurchargePercent,
        DutyRatePercent      = r.DutyRatePercent,
        VatRatePercent       = r.VatRatePercent,
        HandlingFeeZAR       = r.HandlingFeeZAR,
        MinimumChargeZAR     = r.MinimumChargeZAR,
        ExchangeRateCNYToZAR = r.ExchangeRateCNYToZAR,
        EstimatedTransitDays = r.EstimatedTransitDays,
        IsActive             = r.IsActive,
        Notes                = r.Notes,
        UpdatedAt            = r.UpdatedAt,
    };

    private static ShippingRate FromDto(ShippingRateDto dto) => new()
    {
        Country              = dto.Country,
        ShippingType         = dto.ShippingType,
        RatePerKg            = dto.RatePerKg,
        RatePerCbm           = dto.RatePerCbm,
        FuelSurchargePercent = dto.FuelSurchargePercent,
        DutyRatePercent      = dto.DutyRatePercent,
        VatRatePercent       = dto.VatRatePercent,
        HandlingFeeZAR       = dto.HandlingFeeZAR,
        MinimumChargeZAR     = dto.MinimumChargeZAR,
        ExchangeRateCNYToZAR = dto.ExchangeRateCNYToZAR,
        EstimatedTransitDays = dto.EstimatedTransitDays,
        IsActive             = dto.IsActive,
        Notes                = dto.Notes,
    };
}

// ── DTOs ──────────────────────────────────────────────────────────────────────
public class ShippingRateDto
{
    public int      Id                   { get; set; }
    public string   Country              { get; set; } = string.Empty;
    public string   ShippingType         { get; set; } = string.Empty;
    public decimal  RatePerKg            { get; set; }
    public decimal  RatePerCbm           { get; set; }
    public decimal  FuelSurchargePercent { get; set; }
    public decimal  DutyRatePercent      { get; set; }
    public decimal  VatRatePercent       { get; set; }
    public decimal  HandlingFeeZAR       { get; set; }
    public decimal  MinimumChargeZAR     { get; set; }
    public decimal  ExchangeRateCNYToZAR { get; set; } = 2.40m;
    public int      EstimatedTransitDays { get; set; }
    public bool     IsActive             { get; set; } = true;
    public string?  Notes                { get; set; }
    public DateTime UpdatedAt            { get; set; }
}

public class ShippingCalcRequestDto
{
    public string  Country      { get; set; } = string.Empty;
    public string  ShippingType { get; set; } = string.Empty;
    public decimal WeightKg     { get; set; }
    public decimal VolumeCBM    { get; set; }
}

public class ShippingCalcResultDto
{
    public string  Country              { get; set; } = string.Empty;
    public string  ShippingType         { get; set; } = string.Empty;
    public decimal WeightKg             { get; set; }
    public decimal VolumeCBM            { get; set; }
    public decimal BaseCostCNY          { get; set; }
    public decimal WithSurchargeCNY     { get; set; }
    public decimal WithDutiesCNY        { get; set; }
    public decimal RawZAR               { get; set; }
    public decimal TotalZAR             { get; set; }
    public bool    MinimumApplied       { get; set; }
    public int     EstimatedTransitDays { get; set; }
}
