namespace BDP.API.Models;

/// <summary>
/// Stores the rate parameters for a specific country + shipping type combination.
/// Formula (ZAR) = CEILING(
///     MAX(
///         (weightKg × RatePerKg + volumeCBM × RatePerCbm) × (1 + FuelSurchargePercent/100)
///         × (1 + DutyRatePercent/100)   ← DDP only
///         × (1 + VatRatePercent/100)    ← DDP only
///         × ExchangeRateCNYToZAR
///         + HandlingFeeZAR,
///         MinimumChargeZAR
///     )
/// )
/// </summary>
public class ShippingRate
{
    public int Id { get; set; }

    /// <summary>Destination country, e.g. "South Africa", "United States"</summary>
    public string Country { get; set; } = string.Empty;

    /// <summary>AirDDP | AirDDU | SeaDDP | SeaDDU</summary>
    public string ShippingType { get; set; } = string.Empty;

    /// <summary>CNY per kg – primary driver for air freight</summary>
    public decimal RatePerKg { get; set; }

    /// <summary>CNY per CBM – primary driver for sea freight</summary>
    public decimal RatePerCbm { get; set; }

    /// <summary>Fuel / peak-season surcharge applied to base cost (%)</summary>
    public decimal FuelSurchargePercent { get; set; }

    /// <summary>Import customs duty included in DDP price (%)</summary>
    public decimal DutyRatePercent { get; set; }

    /// <summary>Destination VAT / GST included in DDP price (%)</summary>
    public decimal VatRatePercent { get; set; }

    /// <summary>Flat handling / documentation fee added after conversion (ZAR)</summary>
    public decimal HandlingFeeZAR { get; set; }

    /// <summary>Minimum shipment charge (ZAR) – result is MAX(calculated, minimum)</summary>
    public decimal MinimumChargeZAR { get; set; }

    /// <summary>CNY → ZAR exchange rate for this lane</summary>
    public decimal ExchangeRateCNYToZAR { get; set; } = 2.40m;

    /// <summary>Approximate transit time in days</summary>
    public int EstimatedTransitDays { get; set; }

    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
