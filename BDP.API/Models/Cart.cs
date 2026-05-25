namespace BDP.API.Models;

public class Cart
{
    public int Id { get; set; }
    public string? UserId { get; set; }
    public string SessionToken { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(30);
    public List<CartItem> Items { get; set; } = new();
}
