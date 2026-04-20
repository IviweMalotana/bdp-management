namespace BDP.API.DTOs.Inventory;

public class InventorySummaryDto
{
    public string Location { get; set; } = string.Empty;
    public int TotalOnHand { get; set; }
    public int TotalAvailable { get; set; }
    public int TotalIncoming { get; set; }
    public int TotalCommitted { get; set; }
    public int ItemCount { get; set; }
}
