using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Customisation;

public class CustomisationOptionCreateDto
{
    [Required] public int SupplierId { get; set; }
    [Required] public string Type { get; set; } = string.Empty;
    public string? Link1688 { get; set; }
    [Required] public int MinimumQuantity { get; set; }
}
