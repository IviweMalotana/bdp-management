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
            $"Write a short, plain product title for an empty wholesale cosmetic container. " +
            $"Details: {productName}, {size} {category}, colour {colour}, finish {texture}. " +
            $"Identify the material (glass, PET or acrylic) from the image and include it, and make clear it's an empty container. " +
            $"No marketing words (avoid 'premium', 'luxury', 'elevate', 'professional grade'), no ALL CAPS, no keyword stuffing. " +
            $"Return only the title as plain text, about 10 words or fewer.";

        var title = await CallClaude(titlePrompt, base64Image, imageMimeType, 150);

        var bodyPrompt =
            $"Write a short, factual product description in plain HTML for this cosmetic container: {title}. " +
            $"Reader: a skincare brand owner or formulator deciding whether it fits their product. " +
            $"Cover only what you can tell from the image and specs: material, capacity ({size}), closure or dispensing type, and what it suits. " +
            $"Use one or two short paragraphs, optionally with a plain <ul> spec list (normal <li>, no checkmark symbols or emoji). " +
            $"Write like a knowledgeable supplier, not an ad: no buzzwords ('premium', 'luxurious', 'elevate', 'unlock', 'seamless', 'curated'), no hype, no invented specs. " +
            $"Return HTML only, with no <html> or <body> wrapper.";

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
