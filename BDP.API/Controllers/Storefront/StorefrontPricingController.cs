using BDP.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers.Storefront;

[ApiController]
[Route("api/storefront/pricing")]
public class StorefrontPricingController : ControllerBase
{
    private readonly AppDbContext _db;

    public StorefrontPricingController(AppDbContext db) => _db = db;

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
            ? await _db.CustomisationOptions.Include(c => c.PricingTiers)
                .Where(c => customIds.Contains(c.Id)).ToListAsync()
            : new();

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

            // highest tier where Quantity <= requested
            var matchedTier = tiers.LastOrDefault(t => t.Quantity <= line.Quantity) ?? tiers.First();
            var unitPrice = matchedTier.Quantity > 0 ? matchedTier.SalePriceZAR / matchedTier.Quantity : 0m;
            var lineTotal = unitPrice * line.Quantity;

            decimal customCost = 0;
            if (line.CustomisationOptionId.HasValue)
            {
                var co = customOptions.FirstOrDefault(c => c.Id == line.CustomisationOptionId.Value);
                if (co != null)
                {
                    var cTiers = co.PricingTiers.OrderBy(t => t.Quantity).ToList();
                    var cTier = cTiers.LastOrDefault(t => t.Quantity <= line.Quantity) ?? cTiers.FirstOrDefault();
                    if (cTier != null)
                        customCost = (cTier.Quantity > 0 ? cTier.SalePriceZAR / cTier.Quantity : 0m) * line.Quantity;
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
}
