using BDP.API.Data;
using BDP.API.DTOs.Invoices;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly InvoiceService _invoiceService;

    public InvoicesController(AppDbContext context, InvoiceService invoiceService)
    {
        _context = context;
        _invoiceService = invoiceService;
    }

    // GET /api/invoices?status=&clientId=
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] int? clientId)
    {
        var query = _context.Invoices
            .Include(i => i.Order)
            .Include(i => i.Client)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(i => i.Status == status);
        if (clientId.HasValue)
            query = query.Where(i => i.ClientId == clientId.Value);

        var invoices = await query
            .OrderByDescending(i => i.InvoiceDate)
            .ToListAsync();

        return Ok(invoices.Select(MapToDto));
    }

    // GET /api/invoices/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Order)
            .Include(i => i.Client)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice == null) return NotFound(new { message = $"Invoice {id} not found." });
        return Ok(MapToDto(invoice));
    }

    // POST /api/invoices/{id}/send
    [HttpPost("{id:int}/send")]
    public async Task<IActionResult> Send(int id)
    {
        var invoice = await _context.Invoices.FindAsync(id);
        if (invoice == null) return NotFound(new { message = $"Invoice {id} not found." });

        try
        {
            await _invoiceService.SendInvoiceAsync(id);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to send invoice: {ex.Message}" });
        }

        var updated = await _context.Invoices
            .Include(i => i.Order)
            .Include(i => i.Client)
            .FirstAsync(i => i.Id == id);
        return Ok(MapToDto(updated));
    }

    // PATCH /api/invoices/{id}/mark-paid
    [HttpPatch("{id:int}/mark-paid")]
    public async Task<IActionResult> MarkPaid(int id)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Order)
            .Include(i => i.Client)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice == null) return NotFound(new { message = $"Invoice {id} not found." });

        invoice.Status = "Paid";
        invoice.PaidAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapToDto(invoice));
    }

    // GET /api/invoices/{id}/pdf
    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id)
    {
        var invoice = await _context.Invoices.FindAsync(id);
        if (invoice == null) return NotFound(new { message = $"Invoice {id} not found." });

        try
        {
            var pdfBytes = await _invoiceService.GeneratePdfBytesAsync(id);
            return File(pdfBytes, "application/pdf", $"invoice-{invoice.InvoiceNumber}.pdf");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to generate PDF: {ex.Message}" });
        }
    }

    private static InvoiceDto MapToDto(Invoice i) => new()
    {
        Id = i.Id,
        InvoiceNumber = i.InvoiceNumber,
        OrderId = i.OrderId,
        OrderNumber = i.Order?.OrderNumber ?? string.Empty,
        ClientId = i.ClientId,
        ClientName = i.Client?.CompanyName ?? string.Empty,
        InvoiceDate = i.InvoiceDate,
        DueDate = i.DueDate,
        SubtotalZAR = i.SubtotalZAR,
        VatZAR = i.VatZAR,
        TotalZAR = i.TotalZAR,
        Status = i.Status,
        PdfUrl = i.PdfUrl,
        SentAt = i.SentAt,
        PaidAt = i.PaidAt,
        PaystackPaymentRequestId = i.PaystackPaymentRequestId,
        CreatedAt = i.CreatedAt,
    };
}
