using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Inventory;

public class BulkUpdateInventoryDto
{
    [Required]
    [MinLength(1)]
    public List<BulkInventoryItemDto> Items { get; set; } = new();
}

public class BulkInventoryItemDto
{
    [Range(1, int.MaxValue)] public int Id { get; set; }
    [Range(0, int.MaxValue)] public int OnHandStock { get; set; }
    [Range(0, int.MaxValue)] public int IncomingStock { get; set; }
    [Range(0, int.MaxValue)] public int CommittedStock { get; set; }
    [Range(0, int.MaxValue)] public int AvailableStock { get; set; }
    public bool IsStocked { get; set; }
}
