namespace BDP.API.Services;

/// <summary>
/// Stub — Google Drive integration is not yet configured.
/// Set GoogleDrive:ServiceAccountJson in app secrets to enable.
/// </summary>
public class GoogleDriveService
{
    private readonly IConfiguration _config;
    private readonly ILogger<GoogleDriveService> _logger;

    public GoogleDriveService(IConfiguration config, ILogger<GoogleDriveService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_config["GoogleDrive:ServiceAccountJson"]) ||
        !string.IsNullOrWhiteSpace(_config["GoogleDrive:ServiceAccountJsonPath"]);

    public Task<string?> UploadFileAsync(byte[] fileBytes, string fileName, string mimeType, string? parentFolderId = null)
    {
        _logger.LogWarning("GoogleDriveService is not configured. Upload skipped for {FileName}.", fileName);
        return Task.FromResult<string?>(null);
    }

    public Task<(byte[] Bytes, string ContentType)?> DownloadFileAsync(string driveLinkOrFileId)
    {
        _logger.LogWarning("GoogleDriveService is not configured. Download skipped.");
        return Task.FromResult<(byte[], string)?>(null);
    }

    public static string? ExtractFileIdPublic(string input) => null;
}
