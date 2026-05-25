namespace BDP.API.Models;

public class CartItem
{
    public int Id { get; set; }
    public int CartId { get; set; }
    public int ProductVariantId { get; set; }
    public int Quantity { get; set; }
    public int? CustomisationOptionId { get; set; }
    public string? CustomisationNotes { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public Cart Cart { get; set; } = null!;
    public ProductVariant ProductVariant { get; set; } = null!;
    public CustomisationOption? CustomisationOption { get; set; }
}
