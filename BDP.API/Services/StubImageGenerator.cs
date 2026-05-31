namespace BDP.API.Services;

/// <summary>
/// Placeholder implementation used while we don't have image generation credits or have not chosen a final provider.
/// 
/// This lets the rest of the system (Drive upload, prompt building, orchestration) be built and tested
/// without blocking on paid image generation.
/// </summary>
public class StubImageGenerator : IImageGenerator
{
    private readonly ILogger<StubImageGenerator> _logger;

    public StubImageGenerator(ILogger<StubImageGenerator> logger)
    {
        _logger = logger;
    }

    public bool IsAvailable => false;

    public Task<(byte[] ImageBytes, string MimeType)?> GenerateProductImageAsync(
        byte[] referenceImageBytes,
        string referenceMimeType,
        string prompt,
        string? negativePrompt = null)
    {
        _logger.LogWarning("StubImageGenerator called. No real image generation is configured yet (no credits or provider selected).");

        // For now we return null. In the future this will call the real provider.
        return Task.FromResult<(byte[] ImageBytes, string MimeType)?>(null);
    }
}
