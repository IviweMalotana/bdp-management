using BDP.API.DTOs.Customisation;
using BDP.API.DTOs.Products;

namespace BDP.API.DTOs.Suppliers;

public class SupplierDetailDto : SupplierDto
{
    public List<ProductSummaryDto> Products { get; set; } = new();
    public List<CustomisationOptionDto> CustomisationOptions { get; set; } = new();
}
