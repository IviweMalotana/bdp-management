using BDP.API.Data;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.EntityFrameworkCore;
using MimeKit;

namespace BDP.API.Services;

public class EmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public bool IsConfigured =>
        !string.IsNullOrEmpty(_config["Email:SmtpHost"] ?? _config["Email__SmtpHost"]);

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
        (byte[] data, string fileName, string contentType)? attachment = null)
    {
        var host = _config["Email:SmtpHost"] ?? _config["Email__SmtpHost"];
        if (string.IsNullOrEmpty(host))
        {
            _logger.LogWarning("Email not configured — skipping send to {Email}", toEmail);
            return;
        }

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
}
