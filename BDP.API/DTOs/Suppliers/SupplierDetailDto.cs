using BDP.API.DTOs.Products;

namespace BDP.API.DTOs.Suppliers;

public class SupplierDetailDto : SupplierDto
{
    public List<ProductDto> Products { get; set; } = new();
}
