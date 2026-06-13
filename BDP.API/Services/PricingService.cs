using BDP.API.DTOs.Products;
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
