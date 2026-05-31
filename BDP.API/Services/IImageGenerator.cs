namespace BDP.API.Services;

/// <summary>
/// Abstraction for AI image generation.
/// 
/// This allows us to easily swap providers later (OpenAI, Ideogram, Flux, Google Imagen, etc.)
/// without changing the rest of the pipeline.
/// </summary>
public interface IImageGenerator
{
    /// <summary>
    /// Whether this generator is currently usable (has valid credentials + credits).
    /// </summary>
    bool IsAvailable { get; }

    /// <summary>
    /// Generates a new product image based on a reference image + detailed color/shape instructions.
    /// </summary>
    /// <param name="referenceImageBytes">Bytes of the original reference photo</param>
    /// <param name="referenceMimeType">e.g. image/jpeg</param>
    /// <param name="prompt">Highly detailed prompt describing the exact bottle + desired colors/finishes</param>
    /// <param name="negativePrompt">Optional things to avoid</param>
    /// <returns>Generated image bytes + mime type, or null if generation failed</returns>
    Task<(byte[] ImageBytes, string MimeType)?> GenerateProductImageAsync(
        byte[] referenceImageBytes,
        string referenceMimeType,
        string prompt,
        string? negativePrompt = null);
}
