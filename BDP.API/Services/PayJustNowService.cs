using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BDP.API.Services;

/// <summary>
/// PayJustNow "Pay in 3" checkout integration (https://github.com/PayJustNow/Api).
/// Customers pay upfront via PayJustNow — the merchant is settled, PayJustNow carries
/// the instalments. Auth is HTTP Basic base64(merchantId:apiKey). Base URL defaults to
/// the sandbox; set PayJustNow:BaseUrl to https://api.payjustnow.com to go live.
/// </summary>
public class PayJustNowService
{
    private readonly HttpClient _http;
    private readonly ILogger<PayJustNowService> _logger;
    private readonly string _merchantId;
    private readonly string _apiKey;

    public PayJustNowService(IHttpClientFactory httpFactory, IConfiguration config, ILogger<PayJustNowService> logger)
    {
        _http = httpFactory.CreateClient();
        var baseUrl = config["PayJustNow:BaseUrl"] ?? config["PayJustNow__BaseUrl"]
            ?? "https://sandbox.payjustnow.com";
        _http.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
        _merchantId = config["PayJustNow:MerchantId"] ?? config["PayJustNow__MerchantId"] ?? string.Empty;
        _apiKey = config["PayJustNow:ApiKey"] ?? config["PayJustNow__ApiKey"] ?? string.Empty;
        if (IsConfigured)
        {
            var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_merchantId}:{_apiKey}"));
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basic);
        }
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_merchantId) && !string.IsNullOrWhiteSpace(_apiKey);

    public record CheckoutCustomer(
        string FirstName, string LastName, string Email, string MobileNumber,
        string AddressLine1, string? AddressLine2, string City, string Province, string PostalCode);

    public record CheckoutItem(string MerchantReference, int Quantity, string Description, long UnitPriceCents);

    public record CheckoutResult(string Token, string RedirectTo, DateTime? ExpiresAt);

    /// <summary>
    /// Creates a PayJustNow checkout and returns the token + redirect URL to send the
    /// customer to. Returns null if not configured or the call fails (caller falls back).
    /// amountCents and item unit prices are integer cents (ZAR).
    /// </summary>
    public async Task<CheckoutResult?> CreateCheckoutAsync(
        CheckoutCustomer customer,
        string merchantReference,
        long amountCents,
        string successCallbackUrl,
        string failCallbackUrl,
        IEnumerable<CheckoutItem> items)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("PayJustNow not configured; checkout skipped for {Ref}.", merchantReference);
            return null;
        }

        var body = new
        {
            customer = new
            {
                first_name = customer.FirstName,
                last_name = customer.LastName,
                email = customer.Email,
                mobile_number = customer.MobileNumber,
                address = new
                {
                    address_line_1 = customer.AddressLine1,
                    address_line_2 = customer.AddressLine2 ?? string.Empty,
                    city = customer.City,
                    province = customer.Province,
                    postal_code = customer.PostalCode,
                }
            },
            order = new
            {
                merchant_reference = merchantReference,
                amount = amountCents,
                success_callback_url = successCallbackUrl,
                fail_callback_url = failCallbackUrl,
                items = items.Select(i => new
                {
                    merchant_reference = i.MerchantReference,
                    quantity = i.Quantity,
                    description = i.Description,
                    unit_price = i.UnitPriceCents,
                }).ToArray()
            }
        };

        try
        {
            var resp = await _http.PostAsync("api/v1/merchant/checkout",
                new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));
            var json = await resp.Content.ReadAsStringAsync();
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogError("PayJustNow checkout failed ({Status}) for {Ref}: {Body}",
                    (int)resp.StatusCode, merchantReference, json);
                return null;
            }
            var parsed = JsonSerializer.Deserialize<CheckoutResponse>(json);
            if (parsed == null || string.IsNullOrWhiteSpace(parsed.RedirectTo))
            {
                _logger.LogError("PayJustNow checkout returned no redirect for {Ref}: {Body}", merchantReference, json);
                return null;
            }
            return new CheckoutResult(parsed.Token ?? string.Empty, parsed.RedirectTo, parsed.ExpiresAt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PayJustNow checkout error for {Ref}.", merchantReference);
            return null;
        }
    }

    private class CheckoutResponse
    {
        [JsonPropertyName("token")] public string? Token { get; set; }
        [JsonPropertyName("redirect_to")] public string? RedirectTo { get; set; }
        [JsonPropertyName("expires_at")] public DateTime? ExpiresAt { get; set; }
    }
}
