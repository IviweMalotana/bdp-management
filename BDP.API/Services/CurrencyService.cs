using System.Text.Json;
using BDP.API.Data;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Services;

public class CurrencyService
{
    private readonly AppDbContext _db;
    private readonly HttpClient _http;
    private readonly ILogger<CurrencyService> _logger;

    public CurrencyService(AppDbContext db, IHttpClientFactory httpFactory, ILogger<CurrencyService> logger)
    {
        _db = db;
        _http = httpFactory.CreateClient();
        _logger = logger;
    }

    /// <summary>
    /// Fetches latest rates from frankfurter.app and updates the DB.
    /// Silently no-ops if the request fails — seed rates remain valid.
    /// </summary>
    public async Task RefreshRatesAsync()
    {
        try
        {
            var response = await _http.GetAsync(
                "https://api.frankfurter.app/latest?from=ZAR&to=GBP,USD,EUR,AUD");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Currency refresh: frankfurter.app returned {Status}", response.StatusCode);
                return;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            if (!doc.RootElement.TryGetProperty("rates", out var rates))
            {
                _logger.LogWarning("Currency refresh: response missing 'rates' property");
                return;
            }

            var now = DateTime.UtcNow;
            foreach (var rate in rates.EnumerateObject())
            {
                var code = rate.Name;
                var value = rate.Value.GetDecimal();

                var record = await _db.CurrencyRates.FirstOrDefaultAsync(r => r.Code == code);
                if (record != null)
                {
                    record.RateFromZAR = value;
                    record.LastUpdated = now;
                }
            }

            await _db.SaveChangesAsync();
            _logger.LogInformation("Currency rates refreshed successfully at {Time}", now);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Currency refresh failed — seed rates remain in effect");
        }
    }
}
