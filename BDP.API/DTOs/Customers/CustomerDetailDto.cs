using BDP.API.DTOs.Orders;

namespace BDP.API.DTOs.Customers;

public class CustomerDetailDto : CustomerDto
{
    public List<OrderDto> Orders { get; set; } = new();
}
