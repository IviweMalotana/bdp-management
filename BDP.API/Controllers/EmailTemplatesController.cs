using BDP.API.Data;
using BDP.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/email-templates")]
[Authorize]
public class EmailTemplatesController : ControllerBase
{
    private readonly AppDbContext _db;

    public EmailTemplatesController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/email-templates — list (no HtmlBody for speed)
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var templates = await _db.EmailTemplates
            .OrderBy(t => t.Id)
            .Select(t => new
            {
                t.Id,
                t.Key,
                t.Name,
                t.Description,
                t.Subject,
                t.UpdatedAt,
            })
            .ToListAsync();

        return Ok(templates);
    }

    // GET /api/email-templates/{key}
    [HttpGet("{key}")]
    public async Task<IActionResult> Get(string key)
    {
        var template = await _db.EmailTemplates.FirstOrDefaultAsync(t => t.Key == key);
        if (template == null) return NotFound(new { message = $"Template '{key}' not found." });
        return Ok(template);
    }

    // PUT /api/email-templates/{key}
    [HttpPut("{key}")]
    public async Task<IActionResult> Update(string key, [FromBody] UpdateTemplateRequest request)
    {
        var template = await _db.EmailTemplates.FirstOrDefaultAsync(t => t.Key == key);
        if (template == null) return NotFound(new { message = $"Template '{key}' not found." });

        template.Subject = request.Subject;
        template.HtmlBody = request.HtmlBody;
        template.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(template);
    }

    // POST /api/email-templates/{key}/reset
    [HttpPost("{key}/reset")]
    public async Task<IActionResult> Reset(string key)
    {
        var template = await _db.EmailTemplates.FirstOrDefaultAsync(t => t.Key == key);
        if (template == null) return NotFound(new { message = $"Template '{key}' not found." });

        if (!Defaults.TryGetValue(key, out var defaults))
            return BadRequest(new { message = $"No default found for template '{key}'." });

        template.Subject = defaults.Subject;
        template.HtmlBody = defaults.HtmlBody;
        template.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(template);
    }

    // ── Static defaults dictionary ─────────────────────────────────────────────

    private static readonly Dictionary<string, (string Subject, string HtmlBody)> Defaults =
        new()
        {
            ["order_confirmation"] = (
                "Order confirmed — {{OrderNumber}}",
                EmailTemplateSeeder.GetDefault("order_confirmation")),
            ["order_shipped"] = (
                "Your BDP order {{OrderNumber}} is on its way",
                EmailTemplateSeeder.GetDefault("order_shipped")),
            ["invoice_sent"] = (
                "Invoice {{InvoiceNumber}} from BDP Packaging",
                EmailTemplateSeeder.GetDefault("invoice_sent")),
            ["recurring_order_generated"] = (
                "Order Generated: {{OrderNumber}}",
                EmailTemplateSeeder.GetDefault("recurring_order_generated")),
            ["b2b_approved"] = (
                "Your B2B account has been approved — BDP Packaging",
                EmailTemplateSeeder.GetDefault("b2b_approved")),
        };
}

public record UpdateTemplateRequest(string Subject, string HtmlBody);
