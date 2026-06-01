using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Orders;

public class UpdateOrderStatusDto
{
    [Required]
    [RegularExpression(
        @"^(Placed|Processing|Customisation Accepted|Ready to Ship|Shipped|Delivered|Cancelled|Draft|Pending|Confirmed|InProduction)$",
        ErrorMessage = "Invalid status value.")]
    public string Status { get; set; } = string.Empty;
}
