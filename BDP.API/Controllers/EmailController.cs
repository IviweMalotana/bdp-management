using BDP.API.Data;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/email")]
[Authorize]
public class EmailController : ControllerBase
{
    private readonly EmailService _email;
    private readonly ILogger<EmailController> _logger;

    public EmailController(EmailService email, ILogger<EmailController> logger)
    {
        _email = email;
        _logger = logger;
    }

    // GET /api/email/status — is SMTP configured?
    [HttpGet("status")]
    public IActionResult Status() => Ok(new
    {
        configured = _email.IsConfigured,
        fromAddress = _email.FromAddress,
    });

    // GET /api/email/logs — recent send history (sent / failed / skipped)
    [HttpGet("logs")]
    public async Task<IActionResult> Logs([FromServices] AppDbContext db, [FromQuery] int take = 100)
    {
        take = Math.Clamp(take, 1, 500);
        var logs = await db.EmailLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(take)
            .Select(l => new
            {
                l.Id,
                l.ToEmail,
                l.ToName,
                l.Subject,
                l.Category,
                l.Status,
                l.Error,
                l.CreatedAt,
            })
            .ToListAsync();
        return Ok(logs);
    }

    public record TestEmailRequest(string To, string? Subject, string? Message);

    // POST /api/email/test — send a real test email to verify SMTP works
    [HttpPost("test")]
    public async Task<IActionResult> SendTest([FromBody] TestEmailRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.To))
            return BadRequest(new { message = "A recipient email is required." });

        if (!_email.IsConfigured)
            return BadRequest(new { message = "SMTP is not configured. Set the Email__* env vars in Railway." });

        var subject = string.IsNullOrWhiteSpace(dto.Subject)
            ? "BDP test email"
            : dto.Subject!;

        var body = $@"
          <div style=""font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#1C1A17;"">
            <h2 style=""font-family:Georgia,serif;font-weight:normal;color:#1C1A17;"">Be Different Packaging</h2>
            <p style=""font-size:14px;color:#4A4540;line-height:1.6;"">
              {System.Net.WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(dto.Message)
                ? "This is a test email confirming your SMTP configuration is working correctly."
                : dto.Message!)}
            </p>
            <p style=""font-size:12px;color:#9E8F83;margin-top:24px;"">
              Sent from the BDP admin portal · {DateTime.UtcNow:dd MMM yyyy HH:mm} UTC
            </p>
          </div>";

        try
        {
            await _email.SendAsync(dto.To, "Test Recipient", subject, body, category: "test");
            return Ok(new
            {
                success = true,
                to = dto.To,
                from = _email.FromAddress,
                message = $"Test email sent to {dto.To}. Check the inbox (and spam folder)."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Test email to {To} failed", dto.To);
            return StatusCode(502, new
            {
                success = false,
                message = $"SMTP send failed: {ex.Message}"
            });
        }
    }
}
