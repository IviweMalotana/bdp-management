using BDP.API.Data;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers.Storefront;

/// <summary>
/// AI Pro Mockup renders. The free logo-on-bottle visualiser runs entirely client-side;
/// this controller handles the PAID enhancement: the customer pays a small fee, then we
/// run their composite through Photoroom. Photoroom is only ever called after payment is
/// verified, so the AI spend is always covered (safe for guests).
/// </summary>
[ApiController]
[Route("api/storefront/mockup")]
public class StorefrontMockupController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly GoogleDriveService _drive;
    private readonly PaystackService _paystack;
    private readonly PhotoroomService _photoroom;
    private readonly IConfiguration _config;

    private const long MaxImageBytes = 12 * 1024 * 1024; // 12 MB

    public StorefrontMockupController(
        AppDbContext db, GoogleDriveService drive, PaystackService paystack,
        PhotoroomService photoroom, IConfiguration config)
    {
        _db = db;
        _drive = drive;
        _paystack = paystack;
        _photoroom = photoroom;
        _config = config;
    }

    private decimal RenderFeeZAR =>
        decimal.TryParse(_config["Mockup:FeeZAR"], out var f) && f > 0 ? f : 30m;

    /// <summary>
    /// Same-origin image proxy so the client canvas can draw the product photo without
    /// tainting (CORS), which would otherwise block exporting the flattened composite.
    /// Restricted to our own storage hosts to avoid being an open proxy (SSRF).
    /// </summary>
    [HttpGet("image-proxy")]
    public async Task<IActionResult> ImageProxy([FromQuery] string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return BadRequest();

        var lower = url.ToLowerInvariant();
        var allowed = lower.Contains("googleusercontent.com")
            || lower.Contains("drive.google.com")
            || lower.Contains("googleapis.com");
        if (!allowed) return BadRequest(new { message = "Host not allowed." });

        var file = await _drive.DownloadFileAsync(url);
        if (file == null) return NotFound();

        Response.Headers["Access-Control-Allow-Origin"] = "*";
        Response.Headers["Cache-Control"] = "public, max-age=86400";
        return File(file.Value.Bytes, file.Value.ContentType);
    }

    /// <summary>
    /// Step 1: customer submits their flattened composite (logo placed on bottle) + email.
    /// We store the source, create an unpaid render, and start a Paystack charge.
    /// </summary>
    [HttpPost("initiate")]
    [RequestSizeLimit(MaxImageBytes + 1024)]
    public async Task<IActionResult> Initiate(
        IFormFile? image, [FromForm] string? email, [FromForm] int? productVariantId)
    {
        if (image == null || image.Length == 0)
            return BadRequest(new { message = "No composite image provided." });
        if (image.Length > MaxImageBytes)
            return BadRequest(new { message = "Image exceeds the 12 MB limit." });
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            return BadRequest(new { message = "A valid email is required so we can credit the fee back to your order." });

        // Light anti-spam: cap unpaid renders per email in the last hour.
        var since = DateTime.UtcNow.AddHours(-1);
        var recent = await _db.MockupRenders.CountAsync(r => r.Email == email && r.CreatedAt >= since && !r.IsPaid);
        if (recent >= 15)
            return StatusCode(429, new { message = "Too many attempts. Please try again later." });

        byte[] bytes;
        using (var ms = new MemoryStream())
        {
            await image.CopyToAsync(ms);
            bytes = ms.ToArray();
        }

        var sourceUrl = await _drive.UploadFileAsync(
            bytes, $"mockup-source-{Guid.NewGuid():N}.png", "image/png");

        var render = new MockupRender
        {
            Email = email.Trim().ToLowerInvariant(),
            ProductVariantId = productVariantId,
            SourceUrl = sourceUrl,
            FeeZAR = RenderFeeZAR,
            CreditStatus = "none",
        };
        _db.MockupRenders.Add(render);
        await _db.SaveChangesAsync();

        var callback = _config["Mockup:CallbackUrl"]
            ?? $"{_config["StorefrontUrl"] ?? _config["STOREFRONT_URL"]}/visualizer/result";

        var (reference, authorizationUrl, _) = await _paystack.InitializeTransactionAsync(
            render.Email, render.FeeZAR,
            new { render_id = render.Id, channel = "mockup" },
            callback);

        render.PaystackReference = reference;
        await _db.SaveChangesAsync();

        return Ok(new
        {
            renderId = render.Id,
            paystackReference = reference,
            paystackAuthorizationUrl = authorizationUrl,
            paystackPublicKey = _config["Paystack:PublicKey"],
            amountZAR = render.FeeZAR,
        });
    }

    /// <summary>
    /// Step 2: after Paystack returns success, verify it, then run Photoroom and return the result.
    /// Idempotent — re-calling after success just returns the stored result.
    /// </summary>
    [HttpPost("complete/{reference}")]
    public async Task<IActionResult> Complete(string reference)
    {
        var render = await _db.MockupRenders.FirstOrDefaultAsync(r => r.PaystackReference == reference);
        if (render == null) return NotFound(new { message = "Render not found." });

        if (render.IsPaid && !string.IsNullOrEmpty(render.ResultUrl))
            return Ok(new { resultUrl = render.ResultUrl, creditZAR = render.FeeZAR });

        var result = await _paystack.VerifyPaymentAsync(reference);
        if (result == null || result.Status != "success")
            return Ok(new { success = false, message = "Payment not confirmed yet." });

        render.IsPaid = true;
        render.PaidAt = DateTime.UtcNow;
        render.CreditStatus = "available";

        // Pull the source back and enhance it.
        if (!string.IsNullOrEmpty(render.SourceUrl))
        {
            var source = await _drive.DownloadFileAsync(render.SourceUrl);
            if (source.HasValue)
            {
                var enhanced = await _photoroom.EnhanceAsync(source.Value.Bytes, $"mockup-{render.Id}.png");
                if (enhanced != null)
                {
                    render.ResultUrl = await _drive.UploadFileAsync(
                        enhanced, $"mockup-result-{render.Id}.png", "image/png");
                }
            }
        }

        await _db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            resultUrl = render.ResultUrl,   // null if Photoroom unavailable; credit still applies
            creditZAR = render.FeeZAR,
            message = render.ResultUrl == null
                ? "Payment received. Your enhanced mockup is being prepared — we'll email it shortly. The fee is credited to your next order."
                : "Here's your AI mockup. The fee is credited to your next order.",
        });
    }
}
