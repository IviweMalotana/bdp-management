using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace BDP.API.Services;

public class AIContentService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string? _apiKey;

    public AIContentService(IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _httpClientFactory = httpClientFactory;
        _apiKey = config["OpenAI:ApiKey"];
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey) && _apiKey != "YOUR_OPENAI_KEY_HERE";

    public async Task<(string Title, string HtmlBody)> GenerateProductContent(
        string productName, string size, string category, string colour, string texture,
        byte[] imageBytes, string imageMimeType)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("OpenAI API key is not configured.");

        var base64Image = Convert.ToBase64String(imageBytes);
        var imageUrl = $"data:{imageMimeType};base64,{base64Image}";

        var titlePrompt =
            $"Create a high-converting B2B Shopify Product Title for a wholesale cosmetic vessel. " +
            $"Specs: {productName}, {size} {category}, {colour}, {texture}. " +
            $"RULES: Must specify it is an empty bottle. Focus on B2B keywords: Wholesale, Bulk, Professional Grade. " +
            $"Identify material (Glass, PET, Acrylic) from the image. Return ONLY the title string.";

        var title = await CallOpenAI(titlePrompt, imageUrl, 150);

        var bodyPrompt =
            $"Write factual HTML B2B technical specifications for the packaging item: {title}. " +
            $"Target: Cosmetic Chemists, Skincare Brand Owners. " +
            $"Focus on: Material & Durability (identify from image), Capacity: {size}, UV Resistance, Seal Integrity, Closure Type. " +
            $"Use <ul> with black checkmarks (&#10003;). HTML ONLY.";

        var htmlBody = await CallOpenAI(bodyPrompt, imageUrl, 800);

        return (title.Trim(), htmlBody.Trim());
    }

    private async Task<string> CallOpenAI(string prompt, string imageUrl, int maxTokens)
    {
        var http = _httpClientFactory.CreateClient();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        var payload = new
        {
            model = "gpt-4o-mini",
            max_tokens = maxTokens,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "text", text = prompt },
                        new { type = "image_url", image_url = new { url = imageUrl } }
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await http.PostAsync("https://api.openai.com/v1/chat/completions", content);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? string.Empty;
    }
}
