using BDP.API.DTOs.Inventory;

namespace BDP.API.DTOs.Products;

public class ProductDetailDto : ProductDto
{
    public string ShipsFrom { get; set; } = "China";
    public List<ProductPricingTierDto> ProductPricingTiers { get; set; } = new();
    public List<InventoryItemDto> InventoryItems { get; set; } = new();
}
