using BDP.API.Data;
using BDP.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/pricing")]
public class StorefrontPricingController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly PricingService _pricing;

    public StorefrontPricingController(AppDbContext db, PricingService pricing)
    {
        _db = db;
        _pricing = pricing;
    }

    public record QuoteLine(int VariantId, int Quantity, int? CustomisationOptionId);

    [HttpPost("quote")]
    public async Task<IActionResult> Quote([FromBody] List<QuoteLine> lines)
    {
        var variantIds = lines.Select(l => l.VariantId).Distinct().ToList();
        var customIds = lines.Where(l => l.CustomisationOptionId.HasValue)
                             .Select(l => l.CustomisationOptionId!.Value).Distinct().ToList();

        var variants = await _db.ProductVariants
            .Include(v => v.PricingTiers)
            .Where(v => variantIds.Contains(v.Id))
            .ToListAsync();

        var customOptions = customIds.Any()
            ? await _db.CustomisationOptions
                .Where(c => customIds.Contains(c.Id))
                .ToListAsync()
            : new();

        // Fetch customisation settings once for pricing lookups
        var customSettings = customIds.Any()
            ? await _db.CustomisationSettings.ToListAsync()
            : new();

        var rate = await _pricing.GetLiveExchangeRate();

        var resultLines = new List<object>();
        decimal subtotal = 0;
        bool allMoqsMet = true;

        foreach (var line in lines)
        {
            var variant = variants.FirstOrDefault(v => v.Id == line.VariantId);
            if (variant == null) return BadRequest($"Variant {line.VariantId} not found.");

            var tiers = variant.PricingTiers.OrderBy(t => t.Quantity).ToList();
            if (!tiers.Any()) return BadRequest($"Variant {line.VariantId} has no pricing tiers.");

            var moqRequired = tiers.First().Quantity;
            var moqMet = line.Quantity >= moqRequired;
            if (!moqMet) allMoqsMet = false;

            // Interpolate unit price between the two surrounding anchor tiers
            decimal unitPrice = PricingService.InterpolateTierPrice(tiers, line.Quantity);
            var lineTotal = Math.Round(unitPrice * line.Quantity, 2);

            var co = line.CustomisationOptionId.HasValue
                ? customOptions.FirstOrDefault(c => c.Id == line.CustomisationOptionId.Value)
                : null;
            var coSetting = co != null ? customSettings.FirstOrDefault(s => s.Type == co.Type) : null;
            decimal customCost = PricingService.ComputeCustomisationCostZAR(co, coSetting, line.Quantity, rate);

            subtotal += lineTotal + customCost;

            resultLines.Add(new
            {
                line.VariantId,
                line.Quantity,
                unitPriceZAR = unitPrice,
                lineTotalZAR = lineTotal,
                customisationCostZAR = customCost,
                moqRequired,
                moqMet
            });
        }

        return Ok(new { lines = resultLines, subtotalZAR = subtotal, allMoqsMet });
    }
}
