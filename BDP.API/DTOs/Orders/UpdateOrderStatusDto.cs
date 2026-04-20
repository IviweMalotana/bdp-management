using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Orders;

public class UpdateOrderStatusDto
{
    [Required]
    [RegularExpression("^(Pending|Confirmed|In Production|Shipped|Delivered|Cancelled)$",
        ErrorMessage = "Status must be one of: Pending, Confirmed, In Production, Shipped, Delivered, Cancelled")]
    public string Status { get; set; } = string.Empty;
}
