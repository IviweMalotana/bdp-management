using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using System.Text.RegularExpressions;

namespace BDP.API.Services;

public class GoogleDriveService
{
    private const string ArtworkFolderId = "1TTQEFRGYsO8cus-4Fq1OSu8n84JmB39L";

    private readonly IConfiguration _config;
    private readonly ILogger<GoogleDriveService> _logger;

    public GoogleDriveService(IConfiguration config, ILogger<GoogleDriveService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public bool IsConfigured => GetServiceAccountJson() != null;

    private string? GetServiceAccountJson()
    {
        var json = _config["GOOGLE_SERVICE_ACCOUNT_JSON"]
                ?? _config["GoogleDrive:ServiceAccountJson"];
        if (!string.IsNullOrWhiteSpace(json)) return json;

        var path = _config["GoogleDrive:ServiceAccountJsonPath"];
        if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
            return File.ReadAllText(path);

        return null;
    }

    private DriveService BuildDriveService()
    {
        var json = GetServiceAccountJson()
            ?? throw new InvalidOperationException("Google Drive service account not configured.");

        var credential = GoogleCredential
            .FromJson(json)
            .CreateScoped(DriveService.Scope.Drive);

        return new DriveService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "BDP Artwork Uploader",
        });
    }

    public async Task<string?> UploadFileAsync(byte[] fileBytes, string fileName, string mimeType, string? parentFolderId = null)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("GoogleDriveService not configured. Upload skipped for {FileName}.", fileName);
            return null;
        }

        try
        {
            var service = BuildDriveService();
            var folderId = parentFolderId ?? ArtworkFolderId;

            var fileMetadata = new Google.Apis.Drive.v3.Data.File
            {
                Name = fileName,
                Parents = [folderId],
            };

            using var stream = new MemoryStream(fileBytes);
            var request = service.Files.Create(fileMetadata, stream, mimeType);
            request.Fields = "id";

            var result = await request.UploadAsync();
            if (result.Status != Google.Apis.Upload.UploadStatus.Completed)
            {
                _logger.LogError("Drive upload failed for {FileName}: {Exception}", fileName, result.Exception?.Message);
                return null;
            }

            var fileId = request.ResponseBody?.Id;
            if (fileId == null) return null;

            // Make the file readable by anyone with the link
            var permission = new Google.Apis.Drive.v3.Data.Permission
            {
                Type = "anyone",
                Role = "reader",
            };
            await service.Permissions.Create(permission, fileId).ExecuteAsync();

            return $"https://drive.google.com/file/d/{fileId}/view";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading {FileName} to Google Drive.", fileName);
            return null;
        }
    }

    public async Task<(byte[] Bytes, string ContentType)?> DownloadFileAsync(string driveLinkOrFileId)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("GoogleDriveService not configured. Download skipped.");
            return null;
        }

        try
        {
            var fileId = ExtractFileIdPublic(driveLinkOrFileId) ?? driveLinkOrFileId;
            var service = BuildDriveService();

            var meta = await service.Files.Get(fileId).ExecuteAsync();
            var contentType = meta.MimeType ?? "application/octet-stream";

            using var ms = new MemoryStream();
            await service.Files.Get(fileId).DownloadAsync(ms);
            return (ms.ToArray(), contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading file {FileId} from Google Drive.", driveLinkOrFileId);
            return null;
        }
    }

    public static string? ExtractFileIdPublic(string input)
    {
        var match = Regex.Match(input, @"/file/d/([a-zA-Z0-9_-]+)");
        return match.Success ? match.Groups[1].Value : null;
    }
}
