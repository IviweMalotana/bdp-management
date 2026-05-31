namespace BDP.API.Models;

public class CurrencyRate
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;      // "GBP", "USD", "EUR", "AUD", "ZAR"
    public string Symbol { get; set; } = string.Empty;    // "£", "$", "€", "A$", "R"
    public string Name { get; set; } = string.Empty;      // "British Pound", etc.
    public string Flag { get; set; } = string.Empty;      // "🇬🇧", "🇺🇸", etc.
    public string Region { get; set; } = string.Empty;    // "United Kingdom", "United States", etc.
    public decimal RateFromZAR { get; set; } = 1m;       // how many of this currency = 1 ZAR
    public bool IsActive { get; set; } = true;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}
