using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Orders;

public class UpdateOrderDto
{
    [Range(1, int.MaxValue)] public int CustomerId { get; set; }
    [Required]               public string Status { get; set; } = string.Empty;
    public DateTime? EstimatedDeliveryDate { get; set; }
    public string? BrandingType { get; set; }
    public string? Notes { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "Order must have at least one item.")]
    public List<CreateOrderItemDto> Items { get; set; } = new();
}
