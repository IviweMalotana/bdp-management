using System.ComponentModel.DataAnnotations;

namespace BDP.API.DTOs.Customisation;

public class CustomisationOptionCreateDto
{
    [Required] public int SupplierId { get; set; }
    [Required] public string Type { get; set; } = string.Empty;
    [Required] public int MinQuantity { get; set; }
    [Required] public decimal TotalPriceZAR { get; set; }
    public string? Notes { get; set; }
}
