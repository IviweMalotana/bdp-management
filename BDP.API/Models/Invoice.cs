namespace BDP.API.Models;

public class Invoice
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public int ClientId { get; set; }
    public Client Client { get; set; } = null!;
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; }
    public decimal SubtotalZAR { get; set; }
    public decimal VatZAR { get; set; }
    public decimal TotalZAR { get; set; }
    public string Status { get; set; } = "Draft";
    public string? PdfUrl { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? PaystackPaymentRequestId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
