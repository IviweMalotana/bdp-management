using System.Net.Http.Headers;

namespace BDP.API.Services;

/// <summary>
/// Wraps the Photoroom Image Editing API. Used only AFTER a render fee is paid, so the
/// cost is always covered. Takes a composite image (the customer's logo already placed on
/// the bottle photo) and returns a polished, studio-style product image: background removed
/// and replaced with a clean AI-generated backdrop plus a natural shadow.
///
/// Configure with the Photoroom__ApiKey environment variable on Railway.
/// Docs: https://docs.photoroom.com/
/// </summary>
public class PhotoroomService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly ILogger<PhotoroomService> _logger;

    public PhotoroomService(IHttpClientFactory httpFactory, IConfiguration config, ILogger<PhotoroomService> logger)
    {
        _http = httpFactory.CreateClient();
        _apiKey = config["Photoroom:ApiKey"] ?? config["Photoroom__ApiKey"] ?? string.Empty;
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrEmpty(_apiKey);

    /// <summary>
    /// Enhances a composite product image. Returns PNG bytes, or null on failure.
    /// </summary>
    public async Task<byte[]?> EnhanceAsync(byte[] imageBytes, string fileName, string? backgroundPrompt = null)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("Photoroom not configured (no Photoroom__ApiKey). Skipping enhance.");
            return null;
        }

        try
        {
            using var form = new MultipartFormDataContent();
            var imageContent = new ByteArrayContent(imageBytes);
            imageContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            form.Add(imageContent, "imageFile", string.IsNullOrEmpty(fileName) ? "mockup.png" : fileName);

            // v2 image-editing parameters: remove the background, drop in an AI scene,
            // add a natural shadow, and return a clean PNG.
            form.Add(new StringContent("ai.auto"), "background.color");
            form.Add(new StringContent(
                string.IsNullOrWhiteSpace(backgroundPrompt)
                    ? "clean minimal studio surface, soft natural light, premium cosmetic product photography, neutral beige tones"
                    : backgroundPrompt),
                "background.prompt");
            form.Add(new StringContent("ai.soft"), "shadow.mode");
            form.Add(new StringContent("png"), "format");

            using var req = new HttpRequestMessage(HttpMethod.Post, "https://image-api.photoroom.com/v2/edit")
            {
                Content = form,
            };
            req.Headers.Add("x-api-key", _apiKey);

            var resp = await _http.SendAsync(req);
            if (!resp.IsSuccessStatusCode)
            {
                var err = await resp.Content.ReadAsStringAsync();
                _logger.LogError("Photoroom enhance failed ({Status}): {Err}", resp.StatusCode, err);
                return null;
            }

            return await resp.Content.ReadAsByteArrayAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Photoroom enhance threw.");
            return null;
        }
    }
}
