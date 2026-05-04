using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Orders;

public class CreateOrderDto
{
    [Range(1, int.MaxValue)] public int ClientId { get; set; }
    public DateTime? OrderDate { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime? RequiredByDate { get; set; }
    public string? Notes { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "Order must have at least one item.")]
    public List<CreateOrderItemDto> Items { get; set; } = new();
}
