namespace BDP.API.Services;

public static class ShippingCalculator
{
    public static decimal CalculateShippingZAR(
        decimal weightKg, decimal volumeCBM, int quantity,
        decimal cnyPerCbm, decimal cnyPerKg, decimal cnyToZar)
    {
        decimal totalCBM = volumeCBM * quantity;
        decimal totalKg = weightKg * quantity;
        decimal shippingCNY = (totalCBM * cnyPerCbm) + (totalKg * cnyPerKg);
        return shippingCNY * cnyToZar;
    }

    public static decimal CalculateShippingPerUnitZAR(
        decimal weightKg, decimal volumeCBM,
        decimal cnyPerCbm, decimal cnyPerKg, decimal cnyToZar)
    {
        decimal shippingCNY = (volumeCBM * cnyPerCbm) + (weightKg * cnyPerKg);
        return shippingCNY * cnyToZar;
    }

    public static decimal ComputeVolumeCBM(decimal lengthCm, decimal widthCm, decimal heightCm)
        => lengthCm * widthCm * heightCm / 1_000_000m;
}
