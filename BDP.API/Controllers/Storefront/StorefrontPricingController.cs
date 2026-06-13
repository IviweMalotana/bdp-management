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
            decimal unitPrice = InterpolateTierPrice(tiers, line.Quantity);
            var lineTotal = Math.Round(unitPrice * line.Quantity, 2);

            decimal customCost = 0;
            if (line.CustomisationOptionId.HasValue)
            {
                var co = customOptions.FirstOrDefault(c => c.Id == line.CustomisationOptionId.Value);
                if (co != null)
                {
                    var setting = customSettings.FirstOrDefault(s => s.Type == co.Type);
                    if (setting != null)
                    {
                        var customMoq = co.MinimumQuantity ?? setting.DefaultMinimumQuantity;
                        if (line.Quantity >= customMoq)
                        {
                            decimal customUnitPrice;
                            if (setting.Type == "ColourChange")
                            {
                                customUnitPrice = setting.PricePerUnitZAR; // flat fee (R1.25)
                            }
                            else
                            {
                                var costZAR = Math.Round(setting.CostPerUnitCNY * rate, 4);
                                var markup = PricingService.InterpolateMarkup(line.Quantity);
                                customUnitPrice = Math.Round(costZAR * (1 + markup / 100m), 4);
                            }
                            customCost = Math.Round(customUnitPrice * line.Quantity, 2);
                        }
                    }
                }
            }

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

    // Linear interpolation of sale price per unit between the two surrounding anchor tiers
    private static decimal InterpolateTierPrice(List<Models.ProductPricingTier> tiers, int qty)
    {
        if (qty <= tiers.First().Quantity)
            return tiers.First().SalePriceZAR / tiers.First().Quantity;
        if (qty >= tiers.Last().Quantity)
            return tiers.Last().SalePriceZAR / tiers.Last().Quantity;

        for (int i = 0; i < tiers.Count - 1; i++)
        {
            var lower = tiers[i];
            var upper = tiers[i + 1];
            if (qty >= lower.Quantity && qty <= upper.Quantity)
            {
                var t = (decimal)(qty - lower.Quantity) / (upper.Quantity - lower.Quantity);
                var lowerPrice = lower.SalePriceZAR / lower.Quantity;
                var upperPrice = upper.SalePriceZAR / upper.Quantity;
                return Math.Round(lowerPrice + (upperPrice - lowerPrice) * t, 4);
            }
        }

        return tiers.Last().SalePriceZAR / tiers.Last().Quantity;
    }
}
