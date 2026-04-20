using BDP.API.DTOs.Inventory;

namespace BDP.API.DTOs.Products;

public class ProductDetailDto : ProductDto
{
    public List<InventoryItemDto> InventoryItems { get; set; } = new();
}
