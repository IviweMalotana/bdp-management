using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace BDP.API.Services;

public class AIContentService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string? _apiKey;
    private readonly string _model;

    private const string AnthropicVersion = "2023-06-01";
    private const string MessagesEndpoint = "https://api.anthropic.com/v1/messages";

    public AIContentService(IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _httpClientFactory = httpClientFactory;
        // Accept the key from config (Anthropic:ApiKey) or the conventional env var.
        _apiKey = config["Anthropic:ApiKey"]
                  ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
        // Model is configuration-driven so the deployment owns the choice of Claude model.
        _model = config["Anthropic:Model"] is { Length: > 0 } m ? m : "claude-haiku-4-5";
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_apiKey) && _apiKey != "YOUR_ANTHROPIC_KEY_HERE";

    public async Task<(string Title, string HtmlBody)> GenerateProductContent(
        string productName, string size, string category, string colour, string texture,
        byte[] imageBytes, string imageMimeType)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("Anthropic API key is not configured.");

        var base64Image = Convert.ToBase64String(imageBytes);

        var titlePrompt =
            $"Create a high-converting B2B Shopify Product Title for a wholesale cosmetic vessel. " +
            $"Specs: {productName}, {size} {category}, {colour}, {texture}. " +
            $"RULES: Must specify it is an empty bottle. Focus on B2B keywords: Wholesale, Bulk, Professional Grade. " +
            $"Identify material (Glass, PET, Acrylic) from the image. Return ONLY the title string.";

        var title = await CallClaude(titlePrompt, base64Image, imageMimeType, 150);

        var bodyPrompt =
            $"Write factual HTML B2B technical specifications for the packaging item: {title}. " +
            $"Target: Cosmetic Chemists, Skincare Brand Owners. " +
            $"Focus on: Material & Durability (identify from image), Capacity: {size}, UV Resistance, Seal Integrity, Closure Type. " +
            $"Use <ul> with black checkmarks (&#10003;). HTML ONLY.";

        var htmlBody = await CallClaude(bodyPrompt, base64Image, imageMimeType, 800);

        return (title.Trim(), htmlBody.Trim());
    }

    private async Task<string> CallClaude(string prompt, string base64Image, string imageMimeType, int maxTokens)
    {
        var http = _httpClientFactory.CreateClient();
        http.DefaultRequestHeaders.Add("x-api-key", _apiKey);
        http.DefaultRequestHeaders.Add("anthropic-version", AnthropicVersion);

        var payload = new
        {
            model = _model,
            max_tokens = maxTokens,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new
                        {
                            type = "image",
                            source = new
                            {
                                type = "base64",
                                media_type = string.IsNullOrWhiteSpace(imageMimeType) ? "image/jpeg" : imageMimeType,
                                data = base64Image
                            }
                        },
                        new { type = "text", text = prompt }
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await http.PostAsync(MessagesEndpoint, content);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        // Messages API returns a content array of blocks; concatenate the text blocks.
        var sb = new StringBuilder();
        if (doc.RootElement.TryGetProperty("content", out var blocks) &&
            blocks.ValueKind == JsonValueKind.Array)
        {
            foreach (var block in blocks.EnumerateArray())
            {
                if (block.TryGetProperty("type", out var t) && t.GetString() == "text" &&
                    block.TryGetProperty("text", out var txt))
                {
                    sb.Append(txt.GetString());
                }
            }
        }

        return sb.ToString();
    }
}
