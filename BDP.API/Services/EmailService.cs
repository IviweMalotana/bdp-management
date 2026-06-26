using BDP.API.Data;
using BDP.API.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MimeKit;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace BDP.API.Services;

public class EmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpFactory;

    public EmailService(IConfiguration config, ILogger<EmailService> logger,
        IServiceScopeFactory scopeFactory, IHttpClientFactory httpFactory)
    {
        _config = config;
        _logger = logger;
        _scopeFactory = scopeFactory;
        _httpFactory = httpFactory;
    }

    /// <summary>
    /// Resolves the Resend API key. Prefers an explicit Resend__ApiKey; otherwise,
    /// when Email__SmtpHost points at Resend's SMTP relay, the SMTP password *is*
    /// the API key — so an existing SMTP-style config keeps working over HTTPS with
    /// no extra env vars. Returns null when no Resend key is available.
    /// </summary>
    private string? ResendApiKey
    {
        get
        {
            var explicitKey = _config["Resend:ApiKey"] ?? _config["Resend__ApiKey"];
            if (!string.IsNullOrEmpty(explicitKey)) return explicitKey;

            var host = _config["Email:SmtpHost"] ?? _config["Email__SmtpHost"];
            if (!string.IsNullOrEmpty(host) && host.Contains("resend", StringComparison.OrdinalIgnoreCase))
                return _config["Email:SmtpPassword"] ?? _config["Email__SmtpPassword"];

            return null;
        }
    }

    private string? SmtpHost => _config["Email:SmtpHost"] ?? _config["Email__SmtpHost"];

    public bool IsConfigured =>
        !string.IsNullOrEmpty(ResendApiKey) || !string.IsNullOrEmpty(SmtpHost);

    public string FromAddress => _config["Email:FromAddress"] ?? "noreply@bdp.co.za";

    /// <summary>
    /// Loads a template from DB; falls back to the hardcoded seeder default if not found.
    /// Returns null if the key is completely unknown.
    /// </summary>
    public async Task<(string Subject, string HtmlBody)?> GetTemplateAsync(AppDbContext db, string key)
    {
        var t = await db.EmailTemplates.FirstOrDefaultAsync(x => x.Key == key);
        if (t != null) return (t.Subject, t.HtmlBody);

        var fallback = EmailTemplateSeeder.GetDefault(key);
        if (string.IsNullOrEmpty(fallback)) return null;

        return (key, fallback); // subject fallback is just the key; callers should use their own subject
    }

    public async Task SendAsync(string toEmail, string toName, string subject, string htmlBody,
        (byte[] data, string fileName, string contentType)? attachment = null,
        string? category = null)
    {
        var resendKey = ResendApiKey;
        var host = SmtpHost;

        if (string.IsNullOrEmpty(resendKey) && string.IsNullOrEmpty(host))
        {
            _logger.LogWarning("Email not configured — skipping send to {Email}", toEmail);
            await LogAsync(toEmail, toName, subject, category, "Skipped", "Email transport not configured");
            return;
        }

        try
        {
            // Prefer Resend's HTTPS API (port 443). Railway (and many cloud hosts)
            // block outbound SMTP ports, so SMTP is only used for local dev.
            if (!string.IsNullOrEmpty(resendKey))
                await SendViaResendAsync(resendKey, toEmail, subject, htmlBody, attachment);
            else
                await SendViaSmtpAsync(host!, toEmail, toName, subject, htmlBody, attachment);

            await LogAsync(toEmail, toName, subject, category, "Sent", null);
        }
        catch (Exception ex)
        {
            await LogAsync(toEmail, toName, subject, category, "Failed", ex.Message);
            throw;
        }
    }

    /// <summary>Sends via the Resend REST API over HTTPS (not blocked by cloud SMTP firewalls).</summary>
    private async Task SendViaResendAsync(string apiKey, string toEmail, string subject,
        string htmlBody, (byte[] data, string fileName, string contentType)? attachment)
    {
        var fromName = _config["Email:FromName"] ?? "BDP";
        var fromAddress = _config["Email:FromAddress"] ?? "noreply@bdp.co.za";

        var payload = new Dictionary<string, object?>
        {
            ["from"] = $"{fromName} <{fromAddress}>",
            ["to"] = new[] { toEmail },
            ["subject"] = subject,
            ["html"] = htmlBody,
        };

        if (attachment.HasValue)
        {
            payload["attachments"] = new[]
            {
                new Dictionary<string, object?>
                {
                    ["filename"] = attachment.Value.fileName,
                    ["content"] = Convert.ToBase64String(attachment.Value.data),
                }
            };
        }

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var client = _httpFactory.CreateClient();
        using var resp = await client.SendAsync(req);
        var body = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"Resend API returned {(int)resp.StatusCode}: {body}");
    }

    /// <summary>Sends via SMTP/STARTTLS (MailKit). Used for local dev or any non-Resend host.</summary>
    private async Task SendViaSmtpAsync(string host, string toEmail, string toName, string subject,
        string htmlBody, (byte[] data, string fileName, string contentType)? attachment)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(
            _config["Email:FromName"] ?? "BDP",
            _config["Email:FromAddress"] ?? "noreply@bdp.co.za"));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;

        var builder = new BodyBuilder { HtmlBody = htmlBody };
        if (attachment.HasValue)
        {
            builder.Attachments.Add(attachment.Value.fileName,
                attachment.Value.data,
                ContentType.Parse(attachment.Value.contentType));
        }
        message.Body = builder.ToMessageBody();

        using var smtp = new SmtpClient();
        await smtp.ConnectAsync(host,
            int.Parse(_config["Email:SmtpPort"] ?? "587"),
            SecureSocketOptions.StartTls);
        await smtp.AuthenticateAsync(
            _config["Email:SmtpUser"] ?? string.Empty,
            _config["Email:SmtpPassword"] ?? string.Empty);
        await smtp.SendAsync(message);
        await smtp.DisconnectAsync(true);
    }

    /// <summary>
    /// Writes an <see cref="EmailLog"/> row on its own DbContext scope so it never
    /// flushes a caller's pending changes or fails their transaction. Logging is
    /// best-effort — a logging error must never break (or hide) the email itself.
    /// </summary>
    private async Task LogAsync(string toEmail, string toName, string subject,
        string? category, string status, string? error)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.EmailLogs.Add(new EmailLog
            {
                ToEmail = toEmail,
                ToName = toName,
                Subject = subject,
                Category = category,
                Status = status,
                Error = error,
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to write email log for {Email}", toEmail);
        }
    }
}
