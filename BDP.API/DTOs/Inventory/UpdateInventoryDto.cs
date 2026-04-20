using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Inventory;

public class UpdateInventoryDto
{
    [Range(0, int.MaxValue)] public int OnHandStock { get; set; }
    [Range(0, int.MaxValue)] public int IncomingStock { get; set; }
    [Range(0, int.MaxValue)] public int CommittedStock { get; set; }
    [Range(0, int.MaxValue)] public int AvailableStock { get; set; }
    public bool IsStocked { get; set; }
    public string? SKU { get; set; }
}
