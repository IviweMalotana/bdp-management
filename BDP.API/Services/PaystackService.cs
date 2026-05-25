using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BDP.API.Services;

public class PaystackService
{
    private readonly HttpClient _http;
    private readonly string _secretKey;
    private readonly ILogger<PaystackService> _logger;
    private readonly IConfiguration _config;

    public PaystackService(IHttpClientFactory httpFactory, IConfiguration config, ILogger<PaystackService> logger)
    {
        _http = httpFactory.CreateClient();
        _http.BaseAddress = new Uri("https://api.paystack.co");
        _secretKey = config["Paystack:SecretKey"] ?? config["Paystack__SecretKey"] ?? string.Empty;
        _http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _secretKey);
        _logger = logger;
        _config = config;
    }

    public async Task<PaystackCustomerResult?> CreateCustomerAsync(
        string email, string firstName, string lastName, string? phone = null)
    {
        var body = new { email, first_name = firstName, last_name = lastName, phone };
        var response = await _http.PostAsync("/customer",
            new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));
        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<PaystackResponse<PaystackCustomerResult>>(json);
        return result?.Data;
    }

    public async Task<PaystackPaymentRequestResult?> CreatePaymentRequestAsync(
        string customerEmail, decimal amountZAR, string description, int? invoiceId = null, int? orderId = null)
    {
        var metadata = new Dictionary<string, object>();
        if (invoiceId.HasValue) metadata["invoice_id"] = invoiceId.Value;
        if (orderId.HasValue) metadata["order_id"] = orderId.Value;

        var body = new
        {
            customer = customerEmail,
            amount = (long)(amountZAR * 100),
            currency = "ZAR",
            description,
            due_date = DateTime.UtcNow.AddDays(30).ToString("yyyy-MM-dd"),
            metadata
        };
        var response = await _http.PostAsync("/paymentrequest",
            new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"));
        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<PaystackResponse<PaystackPaymentRequestResult>>(json);
        return result?.Data;
    }

    public async Task<PaystackTransactionResult?> VerifyPaymentAsync(string reference)
    {
        var response = await _http.GetAsync($"/transaction/verify/{reference}");
        var json = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<PaystackResponse<PaystackTransactionResult>>(json);
        return result?.Data;
    }

    public async Task<(string reference, string authorizationUrl, string accessCode)> InitializeTransactionAsync(
        string email, decimal amountZAR, int orderId)
    {
        var amountKobo = (long)(amountZAR * 100);
        var payload = new
        {
            email,
            amount = amountKobo,
            currency = "ZAR",
            metadata = new { order_id = orderId, channel = "storefront" },
            callback_url = _config["Paystack:StorefrontCallbackUrl"]
        };
        var response = await _http.PostAsync("/transaction/initialize",
            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
        var json = await response.Content.ReadAsStringAsync();
        _logger.LogInformation("Paystack initialize response: {Json}", json);
        var result = JsonSerializer.Deserialize<PaystackResponse<PaystackInitializeResult>>(json);
        if (result?.Data == null)
            throw new InvalidOperationException($"Paystack initialization failed: {json}");
        return (result.Data.Reference, result.Data.AuthorizationUrl, result.Data.AccessCode);
    }

    public bool VerifyWebhookSignature(string rawBody, string signature)
    {
        if (string.IsNullOrEmpty(_secretKey)) return false;
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(_secretKey));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody));
        var computed = Convert.ToHexString(hash).ToLowerInvariant();
        return computed == signature.ToLowerInvariant();
    }
}

public class PaystackResponse<T>
{
    [JsonPropertyName("status")] public bool Status { get; set; }
    [JsonPropertyName("message")] public string Message { get; set; } = string.Empty;
    [JsonPropertyName("data")] public T? Data { get; set; }
}

public class PaystackCustomerResult
{
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("customer_code")] public string CustomerCode { get; set; } = string.Empty;
    [JsonPropertyName("email")] public string Email { get; set; } = string.Empty;
}

public class PaystackPaymentRequestResult
{
    [JsonPropertyName("id")] public long Id { get; set; }
    [JsonPropertyName("request_code")] public string RequestCode { get; set; } = string.Empty;
    [JsonPropertyName("offline_reference")] public string OfflineReference { get; set; } = string.Empty;
    [JsonPropertyName("amount")] public long Amount { get; set; }
    [JsonPropertyName("link")] public string Link { get; set; } = string.Empty;
}

public class PaystackTransactionResult
{
    [JsonPropertyName("reference")] public string Reference { get; set; } = string.Empty;
    [JsonPropertyName("status")] public string Status { get; set; } = string.Empty;
    [JsonPropertyName("amount")] public long Amount { get; set; }
    [JsonPropertyName("paid_at")] public DateTime? PaidAt { get; set; }
}

public class PaystackInitializeResult
{
    [JsonPropertyName("authorization_url")] public string AuthorizationUrl { get; set; } = string.Empty;
    [JsonPropertyName("access_code")] public string AccessCode { get; set; } = string.Empty;
    [JsonPropertyName("reference")] public string Reference { get; set; } = string.Empty;
}
