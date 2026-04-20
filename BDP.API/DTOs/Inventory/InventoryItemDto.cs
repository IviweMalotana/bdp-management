namespace BDP.API.DTOs.Inventory;

public class InventoryItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Location { get; set; } = string.Empty;
    public int OnHandStock { get; set; }
    public int IncomingStock { get; set; }
    public int CommittedStock { get; set; }
    public int AvailableStock { get; set; }
    public bool IsStocked { get; set; }
    public DateTime UpdatedAt { get; set; }
}
