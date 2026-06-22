namespace BDP.API.Models;

/// <summary>
/// A paid "AI Pro Mockup" render. The customer composites their logo onto a bottle
/// (free, client-side), then pays a small fee to generate a polished, AI-enhanced
/// product photo via Photoroom. The fee becomes a credit that is redeemed against a
/// later order for the same email — so the render is effectively free if they buy.
/// </summary>
public class MockupRender
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public int? ProductVariantId { get; set; }

    // Drive URL of the source composite the customer submitted (logo placed on bottle).
    public string? SourceUrl { get; set; }
    // Drive URL of the Photoroom-enhanced result.
    public string? ResultUrl { get; set; }

    public decimal FeeZAR { get; set; }
    public string? PaystackReference { get; set; }
    public bool IsPaid { get; set; }
    public DateTime? PaidAt { get; set; }

    // none → not yet paid; available → paid, redeemable; redeemed → applied to an order.
    public string CreditStatus { get; set; } = "none";
    public int? RedeemedOrderId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ProductVariant? ProductVariant { get; set; }
}
