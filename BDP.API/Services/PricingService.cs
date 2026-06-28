using BDP.API.DTOs.Products;
using BDP.API.Models;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace BDP.API.Services;

public class PricingService
{
    private static readonly int[] StandardQuantities = { 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000 };

    // Anchor points for the sliding-scale markup — applies to both bottles and customisation
    private static readonly (int Qty, decimal Markup)[] MarkupAnchors =
    [
        (10,    50m),
        (50,    40m),
        (100,   35m),
        (250,   30m),
        (500,   28m),
        (1000,  25m),
        (2500,  22m),
        (5000,  20m),
        (10000, 15m),
    ];

    // Returns interpolated markup % for any quantity
    public static decimal InterpolateMarkup(int qty)
    {
        if (qty <= MarkupAnchors[0].Qty) return MarkupAnchors[0].Markup;
        if (qty >= MarkupAnchors[^1].Qty) return MarkupAnchors[^1].Markup;
        for (int i = 0; i < MarkupAnchors.Length - 1; i++)
        {
            var (q1, m1) = MarkupAnchors[i];
            var (q2, m2) = MarkupAnchors[i + 1];
            if (qty >= q1 && qty <= q2)
            {
                var t = (decimal)(qty - q1) / (q2 - q1);
                return m1 + (m2 - m1) * t;
            }
        }
        return MarkupAnchors[^1].Markup;
    }

    // Linear interpolation of sale price PER UNIT between the two surrounding anchor
    // tiers. Shared by the storefront quote AND checkout so the price we charge always
    // equals the price we showed — no more floor-tier vs interpolated divergence.
    public static decimal InterpolateTierPrice(List<ProductPricingTier> tiers, int qty)
    {
        if (tiers.Count == 0) return 0m;
        var ordered = tiers.OrderBy(t => t.Quantity).ToList();
        var first = ordered[0];
        var last = ordered[^1];
        if (qty <= first.Quantity)
            return first.Quantity > 0 ? first.SalePriceZAR / first.Quantity : 0m;
        if (qty >= last.Quantity)
            return last.Quantity > 0 ? last.SalePriceZAR / last.Quantity : 0m;

        for (int i = 0; i < ordered.Count - 1; i++)
        {
            var lower = ordered[i];
            var upper = ordered[i + 1];
            if (qty >= lower.Quantity && qty <= upper.Quantity)
            {
                var t = (decimal)(qty - lower.Quantity) / (upper.Quantity - lower.Quantity);
                var lowerPrice = lower.SalePriceZAR / lower.Quantity;
                var upperPrice = upper.SalePriceZAR / upper.Quantity;
                return Math.Round(lowerPrice + (upperPrice - lowerPrice) * t, 4);
            }
        }
        return last.Quantity > 0 ? last.SalePriceZAR / last.Quantity : 0m;
    }

    // Customisation surcharge for a line — shared by the quote, cart and checkout so the
    // add-on price shown always equals the price charged. Returns 0 below the option's
    // minimum quantity. ColourChange is a flat per-unit fee; printing types are
    // cost x interpolated markup.
    public static decimal ComputeCustomisationCostZAR(
        CustomisationOption? option, CustomisationSetting? setting, int quantity, decimal rate)
    {
        if (option == null || setting == null) return 0m;
        var customMoq = option.MinimumQuantity ?? setting.DefaultMinimumQuantity;
        if (quantity < customMoq) return 0m;

        decimal unit;
        if (setting.Type == "ColourChange")
        {
            unit = setting.PricePerUnitZAR;
        }
        else
        {
            var costZAR = Math.Round(setting.CostPerUnitCNY * rate, 4);
            var markup = InterpolateMarkup(quantity);
            unit = Math.Round(costZAR * (1 + markup / 100m), 4);
        }
        return Math.Round(unit * quantity, 2);
    }

    public record CustomisationLine(int OptionId, string Type, decimal CostZAR);

    // Resolve the customisation option IDs on a line: the JSON list when present
    // (multiple add-ons, e.g. printing + colour), else the legacy single id.
    public static List<int> ParseCustomisationOptionIds(string? idsJson, int? legacySingle)
    {
        if (!string.IsNullOrWhiteSpace(idsJson))
        {
            try
            {
                var ids = JsonSerializer.Deserialize<List<int>>(idsJson);
                if (ids != null && ids.Count > 0) return ids.Distinct().ToList();
            }
            catch { /* fall through to legacy */ }
        }
        return legacySingle.HasValue ? new List<int> { legacySingle.Value } : new List<int>();
    }

    // Per-option customisation costs for a line (each add-on priced and summed by callers).
    public static List<CustomisationLine> ComputeCustomisationBreakdown(
        IEnumerable<CustomisationOption> options, List<CustomisationSetting> settings, int quantity, decimal rate)
    {
        var lines = new List<CustomisationLine>();
        foreach (var o in options)
        {
            var setting = settings.FirstOrDefault(s => s.Type == o.Type);
            var cost = ComputeCustomisationCostZAR(o, setting, quantity, rate);
            if (cost > 0) lines.Add(new CustomisationLine(o.Id, o.Type, cost));
        }
        return lines;
    }

    private static readonly Dictionary<int, decimal> MarkupTable = MarkupAnchors
        .ToDictionary(a => a.Qty, a => a.Markup);

    private readonly IMemoryCache _cache;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PricingService> _logger;
    private const string CacheKey = "cny_zar_rate";
    private const decimal FallbackRate = 2.6m;

    public PricingService(IMemoryCache cache, IHttpClientFactory httpClientFactory, ILogger<PricingService> logger)
    {
        _cache = cache;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<decimal> GetLiveExchangeRate()
    {
        if (_cache.TryGetValue(CacheKey, out decimal cached))
            return cached;

        try
        {
            var http = _httpClientFactory.CreateClient();
            http.Timeout = TimeSpan.FromSeconds(5);
            var response = await http.GetStringAsync("https://api.frankfurter.app/latest?from=CNY&to=ZAR");
            using var doc = JsonDocument.Parse(response);
            var rate = doc.RootElement.GetProperty("rates").GetProperty("ZAR").GetDecimal();
            if (rate > 0)
            {
                _cache.Set(CacheKey, rate, TimeSpan.FromHours(1));
                return rate;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "CNY/ZAR exchange rate fetch failed — using fallback {Rate}", FallbackRate);
        }

        return FallbackRate;
    }

    public async Task<(decimal ExchangeRate, decimal CostPerUnitZAR, List<PricingTierCalculationDto> Tiers)>
        CalculatePricingTiers(decimal costCNY, string productName, string category, string sizeFull,
            string bottleColour, string lidColour, string texture)
    {
        var rate = await GetLiveExchangeRate();
        var costZAR = Math.Round((costCNY + 1.0m) * 1.03m * rate, 5);

        var tiers = new List<PricingTierCalculationDto>();
        decimal salePriceAt10 = 0;

        foreach (var qty in StandardQuantities)
        {
            var markup = MarkupTable[qty];
            var salePu = Math.Round(costZAR * (1 + markup / 100m), 2);
            if (qty == 10) salePriceAt10 = salePu;

            var totalCost = Math.Round(costZAR * qty, 2);
            var totalSale = Math.Round(salePu * qty, 2);
            var totalProfit = Math.Round(totalSale - totalCost, 2);
            var margin = totalSale > 0 ? Math.Round(totalProfit / totalSale * 100m, 2) : 0m;
            var compareAt = Math.Round(salePriceAt10 * qty, 2);
            var sku = BuildSku(productName, category, sizeFull, bottleColour, lidColour, texture, qty);

            tiers.Add(new PricingTierCalculationDto
            {
                Quantity = qty,
                MarkupPercent = markup,
                SalePricePerUnit = salePu,
                TotalSalePrice = totalSale,
                TotalCostPrice = totalCost,
                ProfitPerUnit = Math.Round(salePu - costZAR, 5),
                TotalProfit = totalProfit,
                MarginPercent = margin,
                CompareAtPrice = compareAt,
                SKU = sku,
            });
        }

        return (rate, costZAR, tiers);
    }

    private static string BuildSku(string name, string category, string size, string bottle, string lid, string texture, int qty)
    {
        static string Clean(string s) => s.ToUpperInvariant().Replace(" ", "");
        return $"{Clean(name)}{Clean(category)}{Clean(size)}{Clean(bottle)}{Clean(lid)}{Clean(texture)}{qty}";
    }
}
