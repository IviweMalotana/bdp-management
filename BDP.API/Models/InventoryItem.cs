namespace BDP.API.Models;

public class InventoryItem
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string SKU { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Location { get; set; } = string.Empty;
    public int OnHandStock { get; set; }
    public int IncomingStock { get; set; } = 0;
    public int CommittedStock { get; set; } = 0;
    public int AvailableStock { get; set; }
    public bool IsStocked { get; set; } = false;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Product Product { get; set; } = null!;
}
