namespace BDP.API.Models;

public class ProductVariant
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;

    // Legacy fields — kept for backwards compatibility
    public string? Size { get; set; }
    public string? BottleColour { get; set; }
    public string? LidColour { get; set; }
    public string? Texture { get; set; }
    public string SKU { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    // Catalogue import fields
    public string? SkuId { get; set; }                 // full SKU from sheet e.g. "HX-Y17-30g-BRN"
    public string? SpecificationSize { get; set; }     // "15g", "30g", "30ml"
    public string? ColorVariantName { get; set; }      // human-readable description
    public string? BaseBodyColor { get; set; }
    public string? BaseBodyFinish { get; set; }        // Glossy, Frosted, Sandblasted
    public string? LidCapColor { get; set; }
    public string? LidCapFinish { get; set; }
    public string? LidCapMaterial { get; set; }        // Plastic, Wood
    public string? ClosureType { get; set; }           // Screw Cap, Dropper
    public string? BodyMaterial { get; set; }          // Glass, Plastic
    public string? AccessoriesIncluded { get; set; }
    public decimal UnitPriceCNY { get; set; }
    public int SupplierMoq { get; set; } = 1;
    public string? ImageFilename { get; set; }
    public string? ImageDriveLink { get; set; }
    public string? Source1688Url { get; set; }

    public decimal WeightKg { get; set; }
    public decimal LengthCm { get; set; }
    public decimal WidthCm  { get; set; }
    public decimal HeightCm { get; set; }

    public List<ProductPricingTier> PricingTiers { get; set; } = new();
}
