namespace BDP.API.DTOs.Invoices;

public class InvoiceDto
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int ClientId { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public DateTime DueDate { get; set; }
    public decimal SubtotalZAR { get; set; }
    public decimal VatZAR { get; set; }
    public decimal TotalZAR { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? PdfUrl { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? PaystackPaymentRequestId { get; set; }
    public DateTime CreatedAt { get; set; }
}
