using System.Text;
using System.Text.Json;

namespace BDP.API.Services;

public class ShippingOption
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int TransitDaysMin { get; set; }
    public int TransitDaysMax { get; set; }
    public decimal PriceZAR { get; set; }
    public bool CustomsIncluded { get; set; }
    public string Carrier { get; set; } = "YunExpress";
    public string Icon { get; set; } = "air"; // "air" or "sea"
}

public class YunExpressService
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _http;
    private readonly ILogger<YunExpressService> _logger;

    // Confirmed base URL from AfterShip integration docs
    private const string BaseUrl = "https://yfoms.yunexpress.com/default/svc/web-service";

    public YunExpressService(IConfiguration config, IHttpClientFactory http, ILogger<YunExpressService> logger)
    {
        _config = config;
        _http = http;
        _logger = logger;
    }

    private string? AppKey => _config["YunExpress:AppKey"];
    private string? AppToken => _config["YunExpress:AppToken"];
    public bool HasCredentials => !string.IsNullOrWhiteSpace(AppKey) && !string.IsNullOrWhiteSpace(AppToken);

    public async Task<List<ShippingOption>> GetRatesAsync(string countryCode, int weightGrams)
    {
        if (HasCredentials)
        {
            try
            {
                var liveRates = await FetchLiveRatesAsync(countryCode, weightGrams);
                if (liveRates.Any()) return liveRates;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "YunExpress live rate fetch failed, falling back to rate table");
            }
        }
        else
        {
            _logger.LogInformation("YunExpress credentials not configured — using rate table fallback");
        }

        return GetFallbackRates(countryCode, weightGrams);
    }

    private async Task<List<ShippingOption>> FetchLiveRatesAsync(string countryCode, int weightGrams)
    {
        var client = _http.CreateClient();
        var weightKg = (decimal)weightGrams / 1000m;

        // YunExpress API auth: appKey + appToken in request body
        // Endpoint and exact field names to be confirmed once portal credentials are available.
        // Built from AfterShip integration docs: yfoms.yunexpress.com/default/svc/web-service
        var payload = new
        {
            appKey = AppKey,
            appToken = AppToken,
            countryCode = countryCode.ToUpper(),
            weight = Math.Round(weightKg, 3),
            // productType omitted — returns all available services
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // TODO: Confirm exact sub-path once portal is found. Common patterns:
        //   POST {BaseUrl}/getfreight
        //   POST {BaseUrl}/queryfreight
        var response = await client.PostAsync($"{BaseUrl}/getfreight", content);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("YunExpress API returned {Status}", response.StatusCode);
            return new List<ShippingOption>();
        }

        var body = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(body);

        // TODO: Map actual response fields once portal docs are confirmed
        // Expected shape: { "result": true, "data": [{ "productCode": "...", "productName": "...", "freight": 12.50, "time": "7-14" }] }
        var options = new List<ShippingOption>();
        if (doc.RootElement.TryGetProperty("data", out var data))
        {
            foreach (var item in data.EnumerateArray())
            {
                var code = item.TryGetProperty("productCode", out var c) ? c.GetString() ?? "" : "";
                var name = item.TryGetProperty("productName", out var n) ? n.GetString() ?? "" : "";
                var freight = item.TryGetProperty("freight", out var f) ? f.GetDecimal() : 0m;
                // Convert USD freight to ZAR at configured rate (default R18.50)
                var zarRate = _config.GetValue<decimal>("YunExpress:UsdToZarRate", 18.5m);
                options.Add(new ShippingOption
                {
                    Code = code,
                    Name = name,
                    Description = name,
                    TransitDaysMin = 7,
                    TransitDaysMax = 20,
                    PriceZAR = Math.Round(freight * zarRate, 2),
                    CustomsIncluded = code.Contains("DDP", StringComparison.OrdinalIgnoreCase),
                    Icon = code.Contains("SEA", StringComparison.OrdinalIgnoreCase) ? "sea" : "air"
                });
            }
        }
        return options;
    }

    // Fallback rate table based on published YunExpress rates (China → destination)
    // Rates in ZAR per kg. Update via admin once real quotes are obtained.
    // Sea options only shown when total weight >= 5kg (approx 12+ units at 400g each)
    private List<ShippingOption> GetFallbackRates(string countryCode, int weightGrams)
    {
        var weightKg = (decimal)weightGrams / 1000m;
        var zone = MapToZone(countryCode);

        var options = new List<ShippingOption>();

        // Zone rates: (airExpressPerKg, airStandardPerKg, seaDapPerKg, seaDdpPerKg)
        var zoneRates = new Dictionary<string, (decimal AirExp, decimal AirStd, decimal SeaDap, decimal SeaDdp,
            int AirExpMin, int AirExpMax, int AirStdMin, int AirStdMax, int SeaMin, int SeaMax)>
        {
            ["ZA"] = (130m, 85m, 35m, 55m, 7, 14, 15, 25, 35, 50),
            ["USA"] = (105m, 65m, 22m, 38m, 5, 10, 10, 20, 25, 40),
            ["UK"] = (95m, 60m, 20m, 35m, 5, 10, 10, 18, 25, 40),
            ["EU"] = (88m, 55m, 18m, 30m, 5, 10, 10, 18, 25, 40),
            ["AU"] = (100m, 70m, 28m, 42m, 5, 12, 10, 20, 30, 45),
            ["REST"] = (120m, 80m, 30m, 48m, 7, 20, 15, 30, 35, 55),
        };

        if (!zoneRates.TryGetValue(zone, out var r)) r = zoneRates["REST"];

        // Air options: YunExpress air typically handles up to 30kg (75 units at 400g)
        // Above that, only sea freight is practical
        const int AirMaxGrams = 30_000;

        if (weightGrams <= AirMaxGrams)
        {
            options.Add(new ShippingOption
            {
                Code = "YUN_AIR_EXPRESS",
                Name = "Air Express",
                Description = "Priority tracked delivery · Duties settled at delivery",
                TransitDaysMin = r.AirExpMin,
                TransitDaysMax = r.AirExpMax,
                PriceZAR = Math.Round(weightKg * r.AirExp, 2),
                CustomsIncluded = false,
                Icon = "air"
            });

            options.Add(new ShippingOption
            {
                Code = "YUN_AIR_STANDARD",
                Name = "Air Standard",
                Description = "Tracked delivery · Duties settled at delivery",
                TransitDaysMin = r.AirStdMin,
                TransitDaysMax = r.AirStdMax,
                PriceZAR = Math.Round(weightKg * r.AirStd, 2),
                CustomsIncluded = false,
                Icon = "air"
            });
        }

        // Sea only practical for 5kg+ shipments
        if (weightGrams >= 5000)
        {
            options.Add(new ShippingOption
            {
                Code = "YUN_SEA_DAP",
                Name = "Sea Freight",
                Description = "Economy sea shipping · You clear customs on arrival",
                TransitDaysMin = r.SeaMin,
                TransitDaysMax = r.SeaMax,
                PriceZAR = Math.Round(weightKg * r.SeaDap, 2),
                CustomsIncluded = false,
                Icon = "sea"
            });

            options.Add(new ShippingOption
            {
                Code = "YUN_SEA_DDP",
                Name = "Sea Freight (All-in)",
                Description = "Economy sea shipping · Duties & customs included",
                TransitDaysMin = r.SeaMin,
                TransitDaysMax = r.SeaMax,
                PriceZAR = Math.Round(weightKg * r.SeaDdp, 2),
                CustomsIncluded = true,
                Icon = "sea"
            });
        }

        return options;
    }

    // ── Tracking ───────────────────────────────────────────────────────────────

    public record TrackingEvent(string Time, string Description, string Location);

    /// <summary>
    /// Fetches tracking events from YunExpress for a given waybill/tracking number.
    /// Returns an empty list if credentials are absent or the API call fails.
    /// </summary>
    public async Task<List<TrackingEvent>> GetTrackingAsync(string trackingNumber)
    {
        if (!HasCredentials)
        {
            _logger.LogInformation("YunExpress credentials not configured — cannot fetch tracking");
            return new List<TrackingEvent>();
        }

        try
        {
            var client = _http.CreateClient();
            var payload = new
            {
                appKey = AppKey,
                appToken = AppToken,
                waybillNumber = trackingNumber,
            };

            var json = System.Text.Json.JsonSerializer.Serialize(payload);
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            // YunExpress tracking endpoint (confirmed from partner docs)
            var response = await client.PostAsync($"{BaseUrl}/getTrace", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("YunExpress tracking API returned {Status}", response.StatusCode);
                return new List<TrackingEvent>();
            }

            var body = await response.Content.ReadAsStringAsync();
            var doc = System.Text.Json.JsonDocument.Parse(body);

            // Expected shape:
            // { "result": true, "data": [{ "time": "2024-01-01 12:00", "description": "...", "location": "..." }] }
            var events = new List<TrackingEvent>();
            if (doc.RootElement.TryGetProperty("data", out var data))
            {
                foreach (var item in data.EnumerateArray())
                {
                    var time = item.TryGetProperty("time", out var t) ? t.GetString() ?? "" : "";
                    var desc = item.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "";
                    var loc  = item.TryGetProperty("location", out var l)  ? l.GetString() ?? "" : "";
                    events.Add(new TrackingEvent(time, desc, loc));
                }
            }

            // Most recent first
            events.Reverse();
            return events;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "YunExpress tracking fetch failed for {TrackingNumber}", trackingNumber);
            return new List<TrackingEvent>();
        }
    }

    // ── Order management ───────────────────────────────────────────────────────

    public record CreateOrderRequest(
        string OrderReference,
        string CountryCode,
        string ProductCode,
        decimal WeightKg,
        decimal LengthCm,
        decimal WidthCm,
        decimal HeightCm,
        int Pieces,
        decimal DeclaredValueUSD,
        string RecipientName,
        string RecipientPhone,
        string RecipientAddress,
        string RecipientCity,
        string RecipientPostcode
    );

    public record CreateOrderResult(
        bool Success,
        string? WaybillNumber,
        string? YunOrderId,
        string? LabelUrl,
        string? ErrorMessage
    );

    public async Task<CreateOrderResult> CreateOrderAsync(CreateOrderRequest req)
    {
        try
        {
            var client = _http.CreateClient();
            var payload = new
            {
                appKey = AppKey,
                appToken = AppToken,
                orderNumber = req.OrderReference,
                countryCode = req.CountryCode,
                productType = req.ProductCode,
                weight = req.WeightKg,
                length = req.LengthCm,
                width = req.WidthCm,
                height = req.HeightCm,
                pieces = req.Pieces,
                declaredValue = req.DeclaredValueUSD,
                recipientName = req.RecipientName,
                recipientPhone = req.RecipientPhone,
                recipientAddress = req.RecipientAddress,
                recipientCity = req.RecipientCity,
                recipientPostcode = req.RecipientPostcode,
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{BaseUrl}/addOrder", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("YunExpress addOrder returned {Status}", response.StatusCode);
                return new CreateOrderResult(false, null, null, null, $"YunExpress API error: {response.StatusCode}");
            }

            var body = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(body);

            var result = doc.RootElement.TryGetProperty("result", out var r) && r.GetBoolean();
            if (!result)
            {
                var msg = doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : "Unknown error";
                return new CreateOrderResult(false, null, null, null, msg);
            }

            string? waybill = null, yunId = null, labelUrl = null;
            if (doc.RootElement.TryGetProperty("data", out var data))
            {
                if (data.TryGetProperty("waybillNumber", out var w)) waybill = w.GetString();
                if (data.TryGetProperty("yunOrderId", out var y)) yunId = y.GetString();
                if (data.TryGetProperty("labelUrl", out var l)) labelUrl = l.GetString();
            }

            return new CreateOrderResult(true, waybill, yunId, labelUrl, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "YunExpress CreateOrderAsync failed for {OrderRef}", req.OrderReference);
            return new CreateOrderResult(false, null, null, null, ex.Message);
        }
    }

    public async Task<(byte[]? PdfBytes, string? LabelUrl)> GetLabelAsync(string waybillNumber)
    {
        try
        {
            var client = _http.CreateClient();
            var payload = new { appKey = AppKey, appToken = AppToken, waybillNumber };
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{BaseUrl}/printLabel", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("YunExpress printLabel returned {Status}", response.StatusCode);
                return (null, null);
            }

            var contentType = response.Content.Headers.ContentType?.MediaType ?? "";
            if (contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase))
            {
                var bytes = await response.Content.ReadAsByteArrayAsync();
                return (bytes, null);
            }

            var body = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("data", out var data))
            {
                if (data.TryGetProperty("labelUrl", out var lu) && !string.IsNullOrEmpty(lu.GetString()))
                {
                    var url = lu.GetString()!;
                    // Fetch the PDF from the URL
                    var pdfResponse = await client.GetAsync(url);
                    if (pdfResponse.IsSuccessStatusCode)
                    {
                        var pdfBytes = await pdfResponse.Content.ReadAsByteArrayAsync();
                        return (pdfBytes, url);
                    }
                    return (null, url);
                }
            }

            return (null, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "YunExpress GetLabelAsync failed for {WaybillNumber}", waybillNumber);
            return (null, null);
        }
    }

    public async Task<bool> CancelOrderAsync(string yunOrderId)
    {
        try
        {
            var client = _http.CreateClient();
            var payload = new { appKey = AppKey, appToken = AppToken, yunOrderId };
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{BaseUrl}/cancelOrder", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("YunExpress cancelOrder returned {Status}", response.StatusCode);
                return false;
            }

            var body = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(body);
            return doc.RootElement.TryGetProperty("result", out var r) && r.GetBoolean();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "YunExpress CancelOrderAsync failed for {YunOrderId}", yunOrderId);
            return false;
        }
    }

    public record YunOrderInfo(string? Status, string? WaybillNumber, string? ProductName, string? CreatedAt);

    public async Task<YunOrderInfo?> GetOrderInfoAsync(string waybillNumber)
    {
        try
        {
            var client = _http.CreateClient();
            var payload = new { appKey = AppKey, appToken = AppToken, waybillNumber };
            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{BaseUrl}/getOrderInfo", content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("YunExpress getOrderInfo returned {Status}", response.StatusCode);
                return null;
            }

            var body = await response.Content.ReadAsStringAsync();
            var doc = JsonDocument.Parse(body);

            if (!doc.RootElement.TryGetProperty("data", out var data))
                return null;

            var status = data.TryGetProperty("status", out var s) ? s.GetString() : null;
            var waybill = data.TryGetProperty("waybillNumber", out var w) ? w.GetString() : null;
            var productName = data.TryGetProperty("productName", out var p) ? p.GetString() : null;
            var createdAt = data.TryGetProperty("createTime", out var c) ? c.GetString() : null;

            return new YunOrderInfo(status, waybill, productName, createdAt);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "YunExpress GetOrderInfoAsync failed for {WaybillNumber}", waybillNumber);
            return null;
        }
    }

    private static string MapToZone(string countryCode) => countryCode.ToUpper() switch
    {
        "ZA" => "ZA",
        "US" or "USA" => "USA",
        "GB" or "UK" => "UK",
        "AU" => "AU",
        "DE" or "FR" or "IT" or "ES" or "NL" or "BE" or "AT" or "SE" or "DK" or "FI" or "NO" or
        "PL" or "PT" or "CH" or "IE" or "CZ" or "HU" or "RO" or "GR" => "EU",
        _ => "REST"
    };
}
