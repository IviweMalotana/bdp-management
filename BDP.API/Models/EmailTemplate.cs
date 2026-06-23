namespace BDP.API.Models;

public class EmailTemplate
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;        // e.g. "order_confirmation"
    public string Name { get; set; } = string.Empty;       // e.g. "Order Confirmation"
    public string Description { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string HtmlBody { get; set; } = string.Empty;   // full HTML, supports {{variables}}
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
