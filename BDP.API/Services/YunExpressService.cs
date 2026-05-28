using System.Security;
using System.Text;
using System.Text.Json;
using System.Xml;

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

    // ── SOAP helper ────────────────────────────────────────────────────────────

    private async Task<JsonElement?> CallSoapAsync(string service, object paramsObj)
    {
        try
        {
            var paramsJson = JsonSerializer.Serialize(paramsObj);
            var escapedParams = SecurityElement.Escape(paramsJson) ?? paramsJson;

            var soapEnvelope = $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV=""http://schemas.xmlsoap.org/soap/envelope/"" xmlns:ns1=""http://www.example.org/Ec/"">
  <SOAP-ENV:Body>
    <ns1:callService>
      <paramsJson>{escapedParams}</paramsJson>
      <appToken>{SecurityElement.Escape(AppToken ?? "")}</appToken>
      <appKey>{SecurityElement.Escape(AppKey ?? "")}</appKey>
      <service>{SecurityElement.Escape(service)}</service>
    </ns1:callService>
  </SOAP-ENV:Body>
</SOAP-ENV:Envelope>";

            var client = _http.CreateClient();
            var content = new StringContent(soapEnvelope, Encoding.UTF8, "text/xml");

            var response = await client.PostAsync(BaseUrl, content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("YunExpress SOAP call {Service} returned {Status}", service, response.StatusCode);
                return null;
            }

            var body = await response.Content.ReadAsStringAsync();

            var xmlDoc = new XmlDocument();
            xmlDoc.LoadXml(body);

            var returnNode = xmlDoc.GetElementsByTagName("return")[0];
            if (returnNode == null)
            {
                _logger.LogWarning("YunExpress SOAP response for {Service} has no <return> element", service);
                return null;
            }

            var jsonText = returnNode.InnerText;
            var doc = JsonDocument.Parse(jsonText);
            return doc.RootElement.Clone();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "YunExpress SOAP call failed for service {Service}", service);
            return null;
        }
    }

    // ── Rates ──────────────────────────────────────────────────────────────────

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
        var weightKg = Math.Round((decimal)weightGrams / 1000m, 3);

        var result = await CallSoapAsync("getFreight", new
        {
            country_code = countryCode.ToUpper(),
            weight = weightKg
        });

        if (result == null) return new List<ShippingOption>();

        var options = new List<ShippingOption>();
        if (result.Value.TryGetProperty("data", out var data))
        {
            var zarRate = _config.GetValue<decimal>("YunExpress:UsdToZarRate", 18.5m);
            foreach (var item in data.EnumerateArray())
            {
                var code = item.TryGetProperty("productCode", out var c) ? c.GetString() ?? "" : "";
                var name = item.TryGetProperty("productName", out var n) ? n.GetString() ?? "" : "";
                var freight = item.TryGetProperty("freight", out var f) ? f.GetDecimal() : 0m;
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

        // Air options: YunExpress air typically handles up to 30kg (75 units at 400g each)
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
            var result = await CallSoapAsync("getOrderTracking", new { order_numbers = trackingNumber });

            if (result == null) return new List<TrackingEvent>();

            var events = new List<TrackingEvent>();
            if (result.Value.TryGetProperty("data", out var data))
            {
                foreach (var item in data.EnumerateArray())
                {
                    var time = item.TryGetProperty("acceptTime", out var t) ? t.GetString() ?? "" : "";
                    var loc  = item.TryGetProperty("acceptAddress", out var l) ? l.GetString() ?? "" : "";
                    var desc = item.TryGetProperty("remark", out var d) ? d.GetString() ?? "" : "";
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
            var result = await CallSoapAsync("createOrder", new
            {
                platform = "OTHER",
                shipping_method = req.ProductCode,
                reference_no = req.OrderReference,
                country_code = req.CountryCode,
                province = req.RecipientAddress,
                city = req.RecipientCity,
                district = "",
                address1 = req.RecipientAddress,
                name = req.RecipientName,
                phone = "",
                cell_phone = req.RecipientPhone,
                email = "",
                order_business_type = "b2c",
                products = new[]
                {
                    new
                    {
                        product_sku = "PKG",
                        product_title = "Cosmetic Packaging",
                        product_title_en = "Cosmetic Packaging",
                        product_quantity = req.Pieces,
                        product_declared_value = req.DeclaredValueUSD,
                        product_weight = req.WeightKg
                    }
                }
            });

            if (result == null)
                return new CreateOrderResult(false, null, null, null, "YunExpress SOAP call failed");

            var success = result.Value.TryGetProperty("result", out var r) && r.GetBoolean();
            if (!success)
            {
                var msg = result.Value.TryGetProperty("message", out var m) ? m.GetString() : "Unknown error";
                return new CreateOrderResult(false, null, null, null, msg);
            }

            string? waybill = null, yunId = null, labelUrl = null;
            if (result.Value.TryGetProperty("data", out var data))
            {
                if (data.TryGetProperty("waybill_code", out var wc)) waybill = wc.GetString();
                else if (data.TryGetProperty("tracking_no", out var tn)) waybill = tn.GetString();
                else if (data.TryGetProperty("order_number", out var on1)) waybill = on1.GetString();

                if (data.TryGetProperty("order_number", out var oid)) yunId = oid.GetString();
                if (data.TryGetProperty("label_url", out var lu)) labelUrl = lu.GetString();
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
            var result = await CallSoapAsync("getLabel", new { order_numbers = waybillNumber });

            if (result == null) return (null, null);

            if (result.Value.TryGetProperty("data", out var data))
            {
                // Prefer a direct URL
                if (data.TryGetProperty("label_url", out var lu) && !string.IsNullOrEmpty(lu.GetString()))
                {
                    var url = lu.GetString()!;
                    var client = _http.CreateClient();
                    var pdfResponse = await client.GetAsync(url);
                    if (pdfResponse.IsSuccessStatusCode)
                    {
                        var pdfBytes = await pdfResponse.Content.ReadAsByteArrayAsync();
                        return (pdfBytes, url);
                    }
                    return (null, url);
                }

                // Fall back to base64-encoded PDF
                if (data.TryGetProperty("file_data", out var fd) && !string.IsNullOrEmpty(fd.GetString()))
                {
                    var bytes = Convert.FromBase64String(fd.GetString()!);
                    return (bytes, null);
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
            var result = await CallSoapAsync("cancelOrder", new { order_numbers = yunOrderId });
            if (result == null) return false;
            return result.Value.TryGetProperty("result", out var r) && r.GetBoolean();
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
            var result = await CallSoapAsync("getOrderInfo", new { order_numbers = waybillNumber });

            if (result == null) return null;

            if (!result.Value.TryGetProperty("data", out var data))
                return null;

            var status = data.TryGetProperty("status", out var s) ? s.GetString() : null;
            var waybill = data.TryGetProperty("waybill_code", out var w) ? w.GetString() : null;
            var productName = data.TryGetProperty("shipping_method", out var p) ? p.GetString() : null;
            var createdAt = data.TryGetProperty("create_time", out var c) ? c.GetString() : null;

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
