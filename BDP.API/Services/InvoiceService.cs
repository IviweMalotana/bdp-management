using BDP.API.Data;
using BDP.API.Models;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BDP.API.Services;

public class InvoiceService
{
    private readonly AppDbContext _context;
    private readonly PaystackService _paystack;
    private readonly EmailService _email;
    private readonly ILogger<InvoiceService> _logger;

    public InvoiceService(
        AppDbContext context, PaystackService paystack, EmailService email,
        ILogger<InvoiceService> logger)
    {
        _context = context;
        _paystack = paystack;
        _email = email;
        _logger = logger;
    }

    public async Task<Invoice> GenerateInvoiceAsync(int orderId)
    {
        var order = await _context.Orders
            .Include(o => o.Client)
            .Include(o => o.Items)
                .ThenInclude(i => i.ProductVariant)
                    .ThenInclude(v => v.Product)
            .FirstOrDefaultAsync(o => o.Id == orderId)
            ?? throw new KeyNotFoundException($"Order {orderId} not found");

        var invoiceNumber = $"INV-{DateTime.UtcNow:yyyyMM}-{order.Id:D4}";
        var dueDate = DateTime.UtcNow.AddDays(order.Client?.PaymentTermsDays ?? 30);

        var invoice = new Invoice
        {
            InvoiceNumber = invoiceNumber,
            OrderId = order.Id,
            ClientId = order.ClientId ?? 0,
            InvoiceDate = DateTime.UtcNow,
            DueDate = dueDate,
            SubtotalZAR = order.SubtotalZAR,
            VatZAR = Math.Round(order.SubtotalZAR * 0.15m, 2),
            TotalZAR = Math.Round(order.SubtotalZAR * 1.15m + order.ShippingCostZAR, 2),
            Status = "Draft"
        };

        // Don't write to disk — PDFs are regenerated on demand to survive redeploys.
        // PdfUrl is set to a stable API route so existing links keep working.
        invoice.PdfUrl = $"/api/invoices/{0}/pdf";  // placeholder; updated after save

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        // Now we have an Id — update PdfUrl with the real route
        invoice.PdfUrl = $"/api/invoices/{invoice.Id}/pdf";
        await _context.SaveChangesAsync();

        return invoice;
    }

    public async Task SendInvoiceAsync(int invoiceId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Order).ThenInclude(o => o.Items)
                .ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .Include(i => i.Client)
            .FirstOrDefaultAsync(i => i.Id == invoiceId)
            ?? throw new KeyNotFoundException($"Invoice {invoiceId} not found");

        // Regenerate PDF in-memory — no filesystem storage required.
        byte[] pdfBytes = GeneratePdf(invoice, invoice.Order);

        // Create Paystack payment request
        try
        {
            var pr = await _paystack.CreatePaymentRequestAsync(
                invoice.Client.ContactEmail,
                invoice.TotalZAR,
                $"Invoice {invoice.InvoiceNumber} for Order {invoice.Order.OrderNumber}",
                invoice.Id,
                invoice.OrderId);
            if (pr != null)
                invoice.PaystackPaymentRequestId = pr.RequestCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create Paystack payment request for invoice {Id}", invoiceId);
        }

        var tmpl = await _email.GetTemplateAsync(_context, "invoice_sent");
        string subject, html;
        if (tmpl.HasValue)
        {
            subject = tmpl.Value.Subject
                .Replace("{{InvoiceNumber}}", invoice.InvoiceNumber);
            html = tmpl.Value.HtmlBody
                .Replace("{{InvoiceNumber}}", invoice.InvoiceNumber)
                .Replace("{{ClientName}}", invoice.Client.ContactPersonName)
                .Replace("{{TotalZAR}}", $"{invoice.TotalZAR:N2}");

            // Append Paystack payment link if available
            if (!string.IsNullOrEmpty(invoice.PaystackPaymentRequestId))
                html = html.Replace("</body>",
                    $"<p style=\"margin:16px 0 0;font-size:13px;color:#4A4540;\">" +
                    $"<a href=\"https://paystack.com/pay/{invoice.PaystackPaymentRequestId}\">Pay online</a></p></body>");
        }
        else
        {
            subject = $"Invoice {invoice.InvoiceNumber} — Victor the Label (Pty) Ltd";
            html = BuildInvoiceEmailHtml(invoice);
        }

        await _email.SendAsync(
            invoice.Client.ContactEmail,
            invoice.Client.ContactPersonName,
            subject,
            html,
            (pdfBytes, $"{invoice.InvoiceNumber}.pdf", "application/pdf"),
            category: "invoice_sent");

        invoice.Status = "Sent";
        invoice.SentAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Generates PDF bytes on demand for a given invoice without writing to disk.
    /// </summary>
    public async Task<byte[]> GeneratePdfBytesAsync(int invoiceId)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Order).ThenInclude(o => o.Items)
                .ThenInclude(i => i.ProductVariant).ThenInclude(v => v.Product)
            .Include(i => i.Order).ThenInclude(o => o.Client)
            .Include(i => i.Client)
            .FirstOrDefaultAsync(i => i.Id == invoiceId)
            ?? throw new KeyNotFoundException($"Invoice {invoiceId} not found");

        return GeneratePdf(invoice, invoice.Order);
    }

    private byte[] GeneratePdf(Invoice invoice, Order order)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Victor the Label (Pty) Ltd")
                            .Bold().FontSize(16);
                        row.ConstantItem(150).AlignRight().Column(c =>
                        {
                            c.Item().Text("INVOICE").Bold().FontSize(20);
                            c.Item().Text($"#{invoice.InvoiceNumber}").FontSize(11);
                        });
                    });
                    col.Item().PaddingTop(4).Text("VAT Reg: — | accounts@victorthelabel.co.za");
                    col.Item().LineHorizontal(1);
                });

                page.Content().PaddingTop(20).Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Bill To:").Bold();
                            c.Item().Text(order.Client?.CompanyName ?? string.Empty);
                            c.Item().Text(order.Client?.ContactPersonName ?? string.Empty);
                            c.Item().Text(order.Client?.ContactEmail ?? string.Empty);
                            if (!string.IsNullOrEmpty(order.Client?.BillingAddress))
                                c.Item().Text(order.Client.BillingAddress);
                        });
                        row.ConstantItem(200).Column(c =>
                        {
                            c.Item().Text($"Invoice Date: {invoice.InvoiceDate:dd MMM yyyy}");
                            c.Item().Text($"Due Date: {invoice.DueDate:dd MMM yyyy}");
                            c.Item().Text($"Order #: {order.OrderNumber}");
                            c.Item().Text($"Payment Terms: {order.Client?.PaymentTermsDays ?? 30} days");
                        });
                    });

                    col.Item().PaddingTop(20).Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.RelativeColumn(4);
                            cols.RelativeColumn(1);
                            cols.RelativeColumn(2);
                            cols.RelativeColumn(2);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background("#1a1a2e").Padding(6)
                                .Text("Description").FontColor(Colors.White).Bold();
                            header.Cell().Background("#1a1a2e").Padding(6)
                                .Text("Qty").FontColor(Colors.White).Bold();
                            header.Cell().Background("#1a1a2e").Padding(6)
                                .Text("Unit Price").FontColor(Colors.White).Bold();
                            header.Cell().Background("#1a1a2e").Padding(6)
                                .Text("Line Total").FontColor(Colors.White).Bold();
                        });

                        var rowIndex = 0;
                        foreach (var item in order.Items)
                        {
                            var bg = rowIndex++ % 2 == 0 ? Colors.White : "#f8f8f8";
                            var desc = item.ProductVariant?.Product?.Name ?? "Product";
                            if (item.ProductVariant != null)
                            {
                                var variantLabel = $"{item.ProductVariant.Size} {item.ProductVariant.BottleColour}".Trim();
                                if (!string.IsNullOrEmpty(variantLabel))
                                    desc += $" — {variantLabel}";
                            }

                            table.Cell().Background(bg).Padding(6).Text(desc);
                            table.Cell().Background(bg).Padding(6).Text(item.Quantity.ToString());
                            table.Cell().Background(bg).Padding(6).Text($"R {item.UnitPriceZAR:N2}");
                            table.Cell().Background(bg).Padding(6).Text($"R {item.LineTotal:N2}");
                        }
                    });

                    col.Item().AlignRight().PaddingTop(12).Column(c =>
                    {
                        c.Item().Row(r =>
                        {
                            r.ConstantItem(120).Text("Subtotal:");
                            r.ConstantItem(100).AlignRight().Text($"R {invoice.SubtotalZAR:N2}");
                        });
                        c.Item().Row(r =>
                        {
                            r.ConstantItem(120).Text("Shipping:");
                            r.ConstantItem(100).AlignRight().Text($"R {order.ShippingCostZAR:N2}");
                        });
                        c.Item().Row(r =>
                        {
                            r.ConstantItem(120).Text("VAT (15%):");
                            r.ConstantItem(100).AlignRight().Text($"R {invoice.VatZAR:N2}");
                        });
                        c.Item().LineHorizontal(1);
                        c.Item().Row(r =>
                        {
                            r.ConstantItem(120).Text("TOTAL:").Bold();
                            r.ConstantItem(100).AlignRight().Text($"R {invoice.TotalZAR:N2}").Bold();
                        });
                    });

                    col.Item().PaddingTop(30).Column(c =>
                    {
                        c.Item().Text("Banking Details:").Bold();
                        c.Item().Text("Bank: FNB | Account Name: Victor the Label (Pty) Ltd");
                        c.Item().Text("Account Number: — | Branch Code: —");
                        c.Item().Text($"Reference: {invoice.InvoiceNumber}");
                    });
                });

                page.Footer().AlignCenter()
                    .Text($"Victor the Label (Pty) Ltd | {invoice.InvoiceNumber} | Thank you for your business");
            });
        }).GeneratePdf();
    }

    private string BuildInvoiceEmailHtml(Invoice invoice) =>
        $"""
        <p>Dear {invoice.Client.ContactPersonName},</p>
        <p>Please find your invoice <strong>{invoice.InvoiceNumber}</strong> attached.</p>
        <table>
            <tr><td>Invoice Date:</td><td>{invoice.InvoiceDate:dd MMM yyyy}</td></tr>
            <tr><td>Due Date:</td><td>{invoice.DueDate:dd MMM yyyy}</td></tr>
            <tr><td>Amount Due:</td><td><strong>R {invoice.TotalZAR:N2}</strong></td></tr>
        </table>
        {(string.IsNullOrEmpty(invoice.PaystackPaymentRequestId) ? string.Empty :
            $"<p>Pay online: <a href=\"https://paystack.com/pay/{invoice.PaystackPaymentRequestId}\">Click here to pay</a></p>")}
        <p>Regards,<br/>Victor the Label (Pty) Ltd</p>
        """;
}
