using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Products;

public class SetPricingTiersDto
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one pricing tier is required.")]
    public List<CreatePricingTierDto> Tiers { get; set; } = new();
}
