using System.Text.Json.Serialization;

namespace BDP.API.DTOs.Paystack;

public class PaystackWebhookPayload
{
    [JsonPropertyName("event")]
    public string Event { get; set; } = string.Empty;

    [JsonPropertyName("data")]
    public PaystackWebhookData Data { get; set; } = new();
}

public class PaystackWebhookData
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("reference")]
    public string Reference { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public long Amount { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = string.Empty;

    [JsonPropertyName("paid_at")]
    public DateTime? PaidAt { get; set; }

    [JsonPropertyName("metadata")]
    public PaystackWebhookMetadata? Metadata { get; set; }
}

public class PaystackWebhookMetadata
{
    [JsonPropertyName("invoice_id")]
    public int? InvoiceId { get; set; }

    [JsonPropertyName("order_id")]
    public int? OrderId { get; set; }
}
