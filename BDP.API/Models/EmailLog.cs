namespace BDP.API.Models;

/// <summary>
/// An audit record of every email the system attempted to send. Written
/// centrally by <see cref="BDP.API.Services.EmailService"/> on every send,
/// including skips (SMTP not configured) and failures — so staff can see
/// what actually went out instead of trusting that it did.
/// </summary>
public class EmailLog
{
    public int Id { get; set; }
    public string ToEmail { get; set; } = string.Empty;
    public string ToName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string? Category { get; set; }    // e.g. "order_confirmation", "invoice_sent", "test"
    public string Status { get; set; } = string.Empty;   // Sent | Failed | Skipped
    public string? Error { get; set; }       // failure reason / skip reason
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
