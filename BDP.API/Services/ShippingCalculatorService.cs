using BDP.API.Data;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Services;

public class ShippingCalculatorService
{
    private readonly AppDbContext _context;

    public ShippingCalculatorService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<(decimal cnyPerCbm, decimal cnyPerKg, decimal cnyToZar)> GetRatesAsync()
    {
        var settings = await _context.ShippingSettings.FindAsync(1);
        if (settings == null)
            return (2000m, 10m, 2.40m);
        return (settings.CnyPerCbm, settings.CnyPerKg, settings.CnyToZarRate);
    }

    public async Task<decimal> CalculateAsync(decimal weightKg, decimal volumeCBM, int quantity)
    {
        var (cnyPerCbm, cnyPerKg, cnyToZar) = await GetRatesAsync();
        return ShippingCalculator.CalculateShippingZAR(weightKg, volumeCBM, quantity, cnyPerCbm, cnyPerKg, cnyToZar);
    }

    public async Task<decimal> CalculatePerUnitAsync(decimal weightKg, decimal volumeCBM)
    {
        var (cnyPerCbm, cnyPerKg, cnyToZar) = await GetRatesAsync();
        return ShippingCalculator.CalculateShippingPerUnitZAR(weightKg, volumeCBM, cnyPerCbm, cnyPerKg, cnyToZar);
    }
}
