namespace BDP.API.Services;

public static class ShippingCalculator
{
    /// <summary>
    /// Fixed billable weight per unit (kg). We intentionally ignore the
    /// uploaded/real per-unit weight and always bill 0.25 kg so shipping cost
    /// is consistent across every product, customer-facing and internal.
    /// The <c>weightKg</c> parameters below are kept for signature stability
    /// but are deliberately not used.
    /// </summary>
    public const decimal FixedUnitWeightKg = 0.25m;

    public static decimal CalculateShippingZAR(
        decimal weightKg, decimal volumeCBM, int quantity,
        decimal cnyPerCbm, decimal cnyPerKg, decimal cnyToZar)
    {
        decimal totalCBM = volumeCBM * quantity;
        decimal totalKg = FixedUnitWeightKg * quantity;
        decimal shippingCNY = (totalCBM * cnyPerCbm) + (totalKg * cnyPerKg);
        return shippingCNY * cnyToZar;
    }

    public static decimal CalculateShippingPerUnitZAR(
        decimal weightKg, decimal volumeCBM,
        decimal cnyPerCbm, decimal cnyPerKg, decimal cnyToZar)
    {
        decimal shippingCNY = (volumeCBM * cnyPerCbm) + (FixedUnitWeightKg * cnyPerKg);
        return shippingCNY * cnyToZar;
    }

    public static decimal ComputeVolumeCBM(decimal lengthCm, decimal widthCm, decimal heightCm)
        => lengthCm * widthCm * heightCm / 1_000_000m;
}
