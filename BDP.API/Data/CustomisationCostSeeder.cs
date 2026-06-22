using BDP.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Data;

/// <summary>
/// Seeds the real per-supplier customisation costs (Silk Screen / Hot Stamping)
/// from the supplier quotes. Idempotent — upserts suppliers, options and the
/// cost tiers on every run, so updating the table here and redeploying refreshes
/// the data. CostPerUnitZAR holds the true landed cost per unit; SalePriceZAR is
/// left 0 so the admin profit view derives sale at the standard markup until an
/// explicit price is set.
/// </summary>
public static class CustomisationCostSeeder
{
    private record CostRow(string Supplier, string Type, string Link, decimal CostCNY,
        decimal CostPerUnitZAR, int[] Quantities);

    // Links
    private const string Hongxin = "https://detail.1688.com/offer/705340046271.html";
    private const string Longhu  = "https://detail.1688.com/offer/751115756678.html";
    private const string Minghui = "https://detail.1688.com/offer/645447477953.html";
    private const string Shijie  = "https://detail.1688.com/offer/901070641557.html";

    private static readonly CostRow[] Rows =
    {
        new("Hongxin Pharmaceutical", "SilkScreen",  Hongxin, 0.1m,  2.95m, new[] { 2500, 5000, 10000 }),
        new("Hongxin Pharmaceutical", "HotStamping", Hongxin, 0.2m,  3.21m, new[] { 2500, 5000, 10000 }),
        new("Shantou Longhu",         "SilkScreen",  Longhu,  2.0m,  8.03m, new[] { 100, 250, 500, 1000, 2500, 5000, 10000 }),
        new("Shantou Longhu",         "HotStamping", Longhu,  0.3m,  3.48m, new[] { 100, 250, 500, 1000, 2500, 5000, 10000 }),
        new("Minghui",                "SilkScreen",  Minghui, 2.38m, 9.05m, new[] { 1000, 2500, 5000, 10000 }),
        new("Minghui",                "HotStamping", Minghui, 2.48m, 9.32m, new[] { 1000, 2500, 5000, 10000 }),
        new("Shijie",                 "SilkScreen",  Shijie,  0.15m, 3.08m, new[] { 10000 }),
    };

    public static async Task SeedAsync(AppDbContext db)
    {
        foreach (var row in Rows)
        {
            // Upsert supplier
            var supplier = await db.Suppliers.FirstOrDefaultAsync(s => s.Name == row.Supplier);
            if (supplier == null)
            {
                supplier = new Supplier
                {
                    Name = row.Supplier,
                    Country = "China",
                    SuppliesCustomisation = true,
                    IsActive = true,
                };
                db.Suppliers.Add(supplier);
                await db.SaveChangesAsync();
            }
            else if (!supplier.SuppliesCustomisation)
            {
                supplier.SuppliesCustomisation = true;
            }

            var moq = row.Quantities.Min();

            // Upsert option
            var option = await db.CustomisationOptions
                .Include(o => o.PricingTiers)
                .FirstOrDefaultAsync(o => o.SupplierId == supplier.Id && o.Type == row.Type);
            if (option == null)
            {
                option = new CustomisationOption
                {
                    SupplierId = supplier.Id,
                    Type = row.Type,
                    Link1688 = row.Link,
                    MinimumQuantity = moq,
                    IsEnabled = true,
                };
                db.CustomisationOptions.Add(option);
                await db.SaveChangesAsync();
            }
            else
            {
                option.Link1688 = row.Link;
                option.MinimumQuantity = moq;
                // Clear existing tiers so we rewrite from source
                db.CustomisationPricingTiers.RemoveRange(option.PricingTiers);
                await db.SaveChangesAsync();
            }

            // Rewrite cost tiers
            foreach (var qty in row.Quantities)
            {
                db.CustomisationPricingTiers.Add(new CustomisationPricingTier
                {
                    CustomisationOptionId = option.Id,
                    Quantity = qty,
                    CostCNY = row.CostCNY,
                    CostWithShippingCNY = row.CostCNY + 1.0m,   // +¥1 inbound buffer
                    CostPerUnitZAR = row.CostPerUnitZAR,         // true landed cost per unit
                    SalePriceZAR = 0m,                          // derived in admin until set
                    SKU = $"{row.Type}-{supplier.Id}-{qty}",
                });
            }
            await db.SaveChangesAsync();
        }
    }
}
