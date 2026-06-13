using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Data;

public static class BDPDataSeeder
{
    public static async Task SeedAsync(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager)
    {
        await SeedRolesAndAdminAsync(userManager, roleManager);
        await SeedSuppliersAsync(context);
        await DeduplicateSuppliersAsync(context);
        await CleanupShellProductsAsync(context);
        await SeedCustomisationSettingsAsync(context);
        await SeedCustomisationOptionsAsync(context);
        await SeedProductsAsync(context);
        await SeedCurrencyRatesAsync(context);
    }

    // ─── Roles & Admin ───────────────────────────────────────────────────────

    private static async Task SeedRolesAndAdminAsync(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager)
    {
        foreach (var role in new[] { "Admin", "Manager" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        const string adminEmail = "admin@bdp.com";
        const string adminPassword = "Admin@123!";
        var existing = await userManager.FindByEmailAsync(adminEmail);
        if (existing == null)
        {
            var admin = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FirstName = "Admin",
                LastName = "User",
                Role = "Admin",
                EmailConfirmed = true,
            };
            var result = await userManager.CreateAsync(admin, adminPassword);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(admin, "Admin");
        }
        else
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(existing);
            await userManager.ResetPasswordAsync(existing, token, adminPassword);
            if (!await userManager.IsInRoleAsync(existing, "Admin"))
                await userManager.AddToRoleAsync(existing, "Admin");
        }
    }

    // ─── Suppliers ───────────────────────────────────────────────────────────

    private static async Task SeedSuppliersAsync(AppDbContext context)
    {
        var defs = new[]
        {
            new { Name = "Hongxin Pharmaceutical",   Country = "China",        SuppliesBottles = true,  SuppliesCustomisation = false },
            new { Name = "Guangdong Fuqi Packaging",  Country = "China",        SuppliesBottles = true,  SuppliesCustomisation = false },
            new { Name = "Wenling Zeguo Siwei",       Country = "China",        SuppliesBottles = true,  SuppliesCustomisation = false },
            new { Name = "Yuyao Fannuo Packaging",    Country = "China",        SuppliesBottles = true,  SuppliesCustomisation = false },
            new { Name = "Charlie Branding (SA)",     Country = "South Africa", SuppliesBottles = false, SuppliesCustomisation = true  },
        };

        foreach (var d in defs)
        {
            var existing = await context.Suppliers.FirstOrDefaultAsync(s => s.Name == d.Name);
            if (existing == null)
            {
                context.Suppliers.Add(new Supplier
                {
                    Name = d.Name,
                    Country = d.Country,
                    SuppliesBottles = d.SuppliesBottles,
                    SuppliesCustomisation = d.SuppliesCustomisation,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        await context.SaveChangesAsync();
    }

    // ─── Supplier Deduplication ──────────────────────────────────────────────
    // Merges duplicates created by the CSV importer into the canonical seeded record.

    private static async Task DeduplicateSuppliersAsync(AppDbContext context)
    {
        var all = await context.Suppliers.ToListAsync();

        var groups = all
            .GroupBy(s => string.Join(" ",
                s.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries).Take(2)),
                StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1);

        foreach (var group in groups)
        {
            // Keep the shortest (canonical seeded) name
            var canonical = group.OrderBy(s => s.Name.Length).ThenBy(s => s.Id).First();
            var duplicates = group.Where(s => s.Id != canonical.Id).ToList();

            foreach (var dup in duplicates)
            {
                // Re-point all products from the duplicate to the canonical supplier
                var affected = await context.Products
                    .Where(p => p.SupplierId == dup.Id)
                    .ToListAsync();
                foreach (var p in affected)
                    p.SupplierId = canonical.Id;

                await context.SaveChangesAsync();
                context.Suppliers.Remove(dup);
            }
        }

        await context.SaveChangesAsync();
    }

    // ─── Shell Product Cleanup ───────────────────────────────────────────────
    // Removes products that have no variants — they were created by the old seeder
    // and are safe to delete (no variants = no order items referencing them).

    private static async Task CleanupShellProductsAsync(AppDbContext context)
    {
        var shells = await context.Products
            .Where(p => !p.Variants.Any())
            .ToListAsync();

        if (shells.Any())
        {
            context.Products.RemoveRange(shells);
            await context.SaveChangesAsync();
        }
    }

    // ─── Customisation Settings (global pricing) ─────────────────────────────

    private static async Task SeedCustomisationSettingsAsync(AppDbContext context)
    {
        const decimal cnyRate = 2.60m; // fallback rate; live rate used at runtime
        // CostCNY = your supplier cost; PricePerUnitZAR = sale price at MOQ anchor (22% markup)
        // ColourChange costs nothing — charged as a flat service fee of R3.00
        var defs = new[]
        {
            new { Type = "ColourChange", CostCNY = 0m,      Price = 3.00m,                                   MOQ = 2500 },
            new { Type = "SilkScreen",   CostCNY = 3.4814m, Price = Math.Round(3.4814m * cnyRate * 1.22m, 4), MOQ = 2500 },
            new { Type = "HotStamping",  CostCNY = 3.5844m, Price = Math.Round(3.5844m * cnyRate * 1.22m, 4), MOQ = 2500 },
        };
        foreach (var d in defs)
        {
            var existing = await context.CustomisationSettings.FirstOrDefaultAsync(s => s.Type == d.Type);
            if (existing == null)
            {
                context.CustomisationSettings.Add(new CustomisationSetting
                {
                    Type = d.Type,
                    CostPerUnitCNY = d.CostCNY,
                    PricePerUnitZAR = d.Price,
                    IsActive = true,
                    DefaultMinimumQuantity = d.MOQ,
                });
            }
            else
            {
                existing.CostPerUnitCNY = d.CostCNY;
                existing.PricePerUnitZAR = d.Price;
                existing.DefaultMinimumQuantity = d.MOQ;
                existing.IsActive = true;
            }
        }
        await context.SaveChangesAsync();
    }

    // ─── Customisation Options (per-supplier availability) ───────────────────

    private static async Task SeedCustomisationOptionsAsync(AppDbContext context)
    {
        var allTypes = new[] { "SilkScreen", "HotStamping", "ColourChange" };

        // Charlie Branding — all three types, global MOQ (null = use setting default)
        var charlie = await context.Suppliers.FirstOrDefaultAsync(s => s.Name == "Charlie Branding (SA)");
        if (charlie != null)
        {
            foreach (var type in allTypes)
            {
                var existing = await context.CustomisationOptions
                    .FirstOrDefaultAsync(co => co.SupplierId == charlie.Id && co.Type == type);
                if (existing == null)
                {
                    context.CustomisationOptions.Add(new CustomisationOption
                    {
                        SupplierId = charlie.Id,
                        Type = type,
                        IsEnabled = true,
                        MinimumQuantity = null,
                    });
                }
                else
                {
                    // Migrate existing options to new schema — clear old MinimumQuantity
                    existing.IsEnabled = true;
                    existing.MinimumQuantity = null;
                }
            }
            await context.SaveChangesAsync();
        }

        // Shijie suppliers — all three types, 10,000 unit MOQ override
        var shijieSuppliers = await context.Suppliers
            .Where(s => EF.Functions.ILike(s.Name, "%Shijie%"))
            .ToListAsync();

        foreach (var supplier in shijieSuppliers)
        {
            foreach (var type in allTypes)
            {
                var existing = await context.CustomisationOptions
                    .FirstOrDefaultAsync(co => co.SupplierId == supplier.Id && co.Type == type);
                if (existing == null)
                {
                    context.CustomisationOptions.Add(new CustomisationOption
                    {
                        SupplierId = supplier.Id,
                        Type = type,
                        IsEnabled = true,
                        MinimumQuantity = 10000,
                    });
                }
                else
                {
                    existing.IsEnabled = true;
                    existing.MinimumQuantity = 10000;
                }
            }
        }
        await context.SaveChangesAsync();
    }

    // ─── Products ────────────────────────────────────────────────────────────

    private static async Task SeedProductsAsync(AppDbContext context)
    {
        var settings = await context.ShippingSettings.FindAsync(1);
        decimal cnyPerCbm = settings?.CnyPerCbm   ?? 2000m;
        decimal cnyPerKg  = settings?.CnyPerKg    ?? 10m;
        decimal cnyToZar  = settings?.CnyToZarRate ?? 2.40m;

        var hongxin  = await context.Suppliers.FirstAsync(s => s.Name == "Hongxin Pharmaceutical");
        var guangdong = await context.Suppliers.FirstAsync(s => s.Name == "Guangdong Fuqi Packaging");

        var productDefs = new[]
        {
            new ProductDef(
                Name: "Devin", Category: "Serum", SupplierId: hongxin.Id,
                Slug: "devin-serum", Link1688: "https://detail.1688.com/offer/705340046271.html",
                WeightKg: 0.10m, LengthCm: 4m, WidthCm: 4m, HeightCm: 12m,
                Variants: new[]
                {
                    new VariantDef("30ml", "Black", "Black", "Matte", "DEV-30BK-BK-MAT",
                        new[] {
                            (10,   3.18m, 4.18m,  11.19m,    167.85m),
                            (50,   3.18m, 4.18m,  11.19m,    783.30m),
                            (100,  3.18m, 4.18m,  11.19m,  1510.65m),
                            (250,  3.18m, 4.18m,  11.19m,  3636.75m),
                            (500,  3.18m, 4.18m,  11.19m,  7161.60m),
                            (1000, 3.18m, 4.18m,  11.19m, 13987.50m),
                            (2500, 3.18m, 4.18m,  11.19m, 34129.50m),
                            (5000, 3.18m, 4.18m,  11.19m, 67140.00m),
                        })
                }),
            new ProductDef(
                Name: "Darla", Category: "Pump", SupplierId: hongxin.Id,
                Slug: "darla-pump", Link1688: null,
                WeightKg: 0.10m, LengthCm: 4m, WidthCm: 4m, HeightCm: 14m,
                Variants: new[]
                {
                    new VariantDef("30ml", "Clear", "White", "Clear", "DAR-30CL-WH-CLR",
                        new[] {
                            (10,   3.50m, 4.50m, 12.05m,   180.75m),
                            (50,   3.50m, 4.50m, 12.05m,   843.50m),
                            (100,  3.50m, 4.50m, 12.05m,  1626.75m),
                            (250,  3.50m, 4.50m, 12.05m,  3916.25m),
                            (500,  3.50m, 4.50m, 12.05m,  7712.00m),
                            (1000, 3.50m, 4.50m, 12.05m, 15062.50m),
                            (2500, 3.50m, 4.50m, 12.05m, 36752.50m),
                            (5000, 3.50m, 4.50m, 12.05m, 72300.00m),
                        })
                }),
            new ProductDef(
                Name: "Delphi", Category: "Pump", SupplierId: hongxin.Id,
                Slug: "delphi-pump", Link1688: null,
                WeightKg: 0.10m, LengthCm: 4m, WidthCm: 4m, HeightCm: 14m,
                Variants: new[]
                {
                    new VariantDef("30ml", "Clear", "White", "Clear", "DEL-30CL-WH-CLR",
                        new[] {
                            (10,   2.58m, 3.58m, 9.59m,   143.85m),
                            (50,   2.58m, 3.58m, 9.59m,   671.30m),
                            (100,  2.58m, 3.58m, 9.59m,  1294.65m),
                            (250,  2.58m, 3.58m, 9.59m,  3116.75m),
                            (500,  2.58m, 3.58m, 9.59m,  6137.60m),
                            (1000, 2.58m, 3.58m, 9.59m, 11987.50m),
                            (2500, 2.58m, 3.58m, 9.59m, 29249.50m),
                            (5000, 2.58m, 3.58m, 9.59m, 57540.00m),
                        })
                }),
            new ProductDef(
                Name: "Danica", Category: "Serum", SupplierId: guangdong.Id,
                Slug: "danica-serum", Link1688: null,
                WeightKg: 0.10m, LengthCm: 4m, WidthCm: 4m, HeightCm: 12m,
                Variants: new[]
                {
                    new VariantDef("30ml", "Orange", "White", "Frosted", "DAN-30OR-WH-FRO",
                        new[] {
                            (50,   2.88m, 3.88m, 10.39m,   727.30m),
                            (100,  2.88m, 3.88m, 10.39m,  1402.65m),
                            (250,  2.88m, 3.88m, 10.39m,  3376.75m),
                            (500,  2.88m, 3.88m, 10.39m,  6649.60m),
                            (1000, 2.88m, 3.88m, 10.39m, 12987.50m),
                            (2500, 2.88m, 3.88m, 10.39m, 31689.50m),
                            (5000, 2.88m, 3.88m, 10.39m, 62340.00m),
                        })
                }),
            new ProductDef(
                Name: "Aurora", Category: "Pump", SupplierId: guangdong.Id,
                Slug: "aurora-pump", Link1688: null,
                WeightKg: 0.10m, LengthCm: 4m, WidthCm: 4m, HeightCm: 14m,
                Variants: new[]
                {
                    new VariantDef("30ml", "Clear", "White", "Frosted", "AUR-30CL-WH-FRO",
                        new[] {
                            (50,   3.50m, 4.50m, 12.05m,   843.50m),
                            (100,  3.50m, 4.50m, 12.05m,  1626.75m),
                            (250,  3.50m, 4.50m, 12.05m,  3916.25m),
                            (500,  3.50m, 4.50m, 12.05m,  7712.00m),
                            (1000, 3.50m, 4.50m, 12.05m, 15062.50m),
                            (2500, 3.50m, 4.50m, 12.05m, 36752.50m),
                            (5000, 3.50m, 4.50m, 12.05m, 72300.00m),
                        })
                }),
            new ProductDef(
                Name: "Daphne", Category: "Jar", SupplierId: guangdong.Id,
                Slug: "daphne-jar", Link1688: null,
                WeightKg: 0.12m, LengthCm: 6m, WidthCm: 6m, HeightCm: 5m,
                Variants: new[]
                {
                    new VariantDef("30g", "Clear", "White", "Clear", "DAP-30CL-WH-CLR",
                        new[] {
                            (50,   3.88m, 4.88m, 13.07m,   914.90m),
                            (100,  3.88m, 4.88m, 13.07m,  1764.45m),
                            (250,  3.88m, 4.88m, 13.07m,  4247.75m),
                            (500,  3.88m, 4.88m, 13.07m,  8364.80m),
                            (1000, 3.88m, 4.88m, 13.07m, 16337.50m),
                            (2500, 3.88m, 4.88m, 13.07m, 39863.50m),
                            (5000, 3.88m, 4.88m, 13.07m, 78420.00m),
                        }),
                    new VariantDef("50g", "Clear", "White", "Clear", "DAP-50CL-WH-CLR",
                        new[] {
                            (50,   4.50m, 5.50m, 14.73m,  1031.10m),
                            (100,  4.50m, 5.50m, 14.73m,  1988.55m),
                            (250,  4.50m, 5.50m, 14.73m,  4787.25m),
                            (500,  4.50m, 5.50m, 14.73m,  9427.20m),
                            (1000, 4.50m, 5.50m, 14.73m, 18412.50m),
                            (2500, 4.50m, 5.50m, 14.73m, 44926.50m),
                            (5000, 4.50m, 5.50m, 14.73m, 88380.00m),
                        })
                }),
            new ProductDef(
                Name: "Dawn", Category: "Serum", SupplierId: hongxin.Id,
                Slug: "dawn-serum", Link1688: null,
                WeightKg: 0.10m, LengthCm: 4m, WidthCm: 4m, HeightCm: 12m,
                Variants: new[]
                {
                    new VariantDef("30ml", "Clear", "Silver", "Clear", "DAW-30CL-SI-CLR",
                        new[] {
                            (10,   2.15m, 3.15m, 8.44m,   126.60m),
                            (50,   2.15m, 3.15m, 8.44m,   590.80m),
                            (100,  2.15m, 3.15m, 8.44m,  1139.40m),
                            (250,  2.15m, 3.15m, 8.44m,  2743.00m),
                            (500,  2.15m, 3.15m, 8.44m,  5401.60m),
                            (1000, 2.15m, 3.15m, 8.44m, 10550.00m),
                            (2500, 2.15m, 3.15m, 8.44m, 25742.00m),
                            (5000, 2.15m, 3.15m, 8.44m, 50640.00m),
                        })
                }),
        };

        foreach (var def in productDefs)
        {
            // Upsert: find the shell product by name (if it was seeded without variants)
            // or create a fresh one. Never delete — avoids FK violations on ShipmentItems.
            var product = await context.Products.FirstOrDefaultAsync(p => p.Name == def.Name);
            if (product == null)
            {
                product = new Product { CreatedAt = DateTime.UtcNow };
                context.Products.Add(product);
            }

            // Always refresh all fields so shell records are corrected.
            product.Name = def.Name;
            product.Category = def.Category;
            product.Slug = def.Slug;
            product.Link1688 = def.Link1688;
            product.MetaTitle = def.Name;
            product.MetaDescription = string.Empty;
            product.MetaKeywords = string.Empty;
            product.SupplierId = def.SupplierId;
            product.WeightKg = def.WeightKg;
            product.LengthCm = def.LengthCm;
            product.WidthCm = def.WidthCm;
            product.HeightCm = def.HeightCm;
            product.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();

            // Skip variant seeding if this product already has them.
            if (await context.ProductVariants.AnyAsync(v => v.ProductId == product.Id))
                continue;

            foreach (var v in def.Variants)
            {
                var variant = new ProductVariant
                {
                    ProductId = product.Id,
                    Size = v.Size,
                    BottleColour = v.BottleColour,
                    LidColour = v.LidColour,
                    Texture = v.Texture,
                    SKU = v.SKU,
                    IsActive = true,
                };
                context.ProductVariants.Add(variant);
                await context.SaveChangesAsync();

                // Use variant-specific dims for Daphne 50g
                decimal wKg = def.WeightKg, lCm = def.LengthCm, wCm = def.WidthCm, hCm = def.HeightCm;
                if (def.Category == "Jar" && v.Size == "50g")
                {
                    wKg = 0.15m; lCm = 7m; wCm = 7m; hCm = 6m;
                }
                var volCBM = ShippingCalculator.ComputeVolumeCBM(lCm, wCm, hCm);

                foreach (var (qty, costCny, costShipCny, costZar, saleZar) in v.Tiers)
                {
                    var shipping = Math.Round(ShippingCalculator.CalculateShippingZAR(
                        wKg, volCBM, qty, cnyPerCbm, cnyPerKg, cnyToZar), 4);

                    context.ProductPricingTiers.Add(new ProductPricingTier
                    {
                        ProductVariantId = variant.Id,
                        Quantity = qty,
                        CostCNY = costCny,
                        CostWithShippingCNY = costShipCny,
                        CostWithDutiesCNY = costShipCny,
                        CostPerUnitZAR = costZar + Math.Round(shipping / qty, 4),
                        SalePriceZAR = saleZar,
                        SKU = $"{v.SKU}-{qty}",
                    });
                }

                await context.SaveChangesAsync();
            }
        }
    }

    // ─── Currency Rates ───────────────────────────────────────────────────────

    private static async Task SeedCurrencyRatesAsync(AppDbContext context)
    {
        var currencies = new[]
        {
            new { Code = "ZAR", Symbol = "R",   Name = "South African Rand", Flag = "🇿🇦", Region = "South Africa",   Rate = 1m },
            new { Code = "GBP", Symbol = "£",   Name = "British Pound",      Flag = "🇬🇧", Region = "United Kingdom", Rate = 0.043m },
            new { Code = "USD", Symbol = "$",   Name = "US Dollar",          Flag = "🇺🇸", Region = "United States",  Rate = 0.054m },
            new { Code = "EUR", Symbol = "€",   Name = "Euro",               Flag = "🇪🇺", Region = "European Union", Rate = 0.050m },
            new { Code = "AUD", Symbol = "A$",  Name = "Australian Dollar",  Flag = "🇦🇺", Region = "Australia",      Rate = 0.083m },
        };

        foreach (var c in currencies)
        {
            var existing = await context.CurrencyRates.FirstOrDefaultAsync(r => r.Code == c.Code);
            if (existing == null)
            {
                context.CurrencyRates.Add(new BDP.API.Models.CurrencyRate
                {
                    Code = c.Code,
                    Symbol = c.Symbol,
                    Name = c.Name,
                    Flag = c.Flag,
                    Region = c.Region,
                    RateFromZAR = c.Rate,
                    IsActive = true,
                    LastUpdated = DateTime.UtcNow,
                });
            }
            else
            {
                // Keep symbol/name/flag/region in sync; do not overwrite live rate
                existing.Symbol = c.Symbol;
                existing.Name = c.Name;
                existing.Flag = c.Flag;
                existing.Region = c.Region;
                existing.IsActive = true;
            }
        }

        await context.SaveChangesAsync();
    }

    // ─── Records ─────────────────────────────────────────────────────────────

    private record ProductDef(
        string Name, string Category, int SupplierId,
        string Slug, string? Link1688,
        decimal WeightKg, decimal LengthCm, decimal WidthCm, decimal HeightCm,
        VariantDef[] Variants);

    private record VariantDef(
        string Size, string BottleColour, string LidColour, string Texture, string SKU,
        (int qty, decimal costCny, decimal costShipCny, decimal costZar, decimal saleZar)[] Tiers);
}
