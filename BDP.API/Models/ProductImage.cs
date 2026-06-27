namespace BDP.API.Models;

public class ProductImage
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string Url { get; set; } = string.Empty;
    public string AltText { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsPrimary { get; set; }

    /// <summary>
    /// Optional logo "smart-warp" for the customise preview — a JSON blob with the
    /// print quad on this photo (4 corners as fractions of the image + a curve
    /// amount). Null = no print area set (storefront falls back to the generic
    /// centred warp). Example:
    /// {"tl":[0.30,0.40],"tr":[0.70,0.42],"br":[0.69,0.72],"bl":[0.31,0.70],"curve":0.5}
    /// </summary>
    public string? PrintArea { get; set; }
}
