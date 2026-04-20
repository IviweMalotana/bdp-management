using BDP.API.Models;
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
        await SeedCustomisationOptionsAsync(context);
        await SeedProductsAsync(context);
        await UpdateProductSuppliersAsync(context);
        await SeedProductPricingTiersAsync(context);
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
        var supplierDefs = new[]
        {
            new { Name = "Hongxin Pharmaceutical",    Country = "China",        OffersCustomisation = false, MinOrderQuantity = 10,  LeadTimeDays = 45 },
            new { Name = "Guangdong Fuqi Packaging",  Country = "China",        OffersCustomisation = false, MinOrderQuantity = 10,  LeadTimeDays = 45 },
            new { Name = "Wenling Zeguo Siwei",       Country = "China",        OffersCustomisation = false, MinOrderQuantity = 10,  LeadTimeDays = 45 },
            new { Name = "Yuyao Fannuo Packaging",    Country = "China",        OffersCustomisation = false, MinOrderQuantity = 10,  LeadTimeDays = 45 },
            new { Name = "Charlie Supplier (SA)",     Country = "South Africa", OffersCustomisation = true,  MinOrderQuantity = 100, LeadTimeDays = 7  },
        };

        foreach (var def in supplierDefs)
        {
            var existing = await context.Suppliers.FirstOrDefaultAsync(s => s.Name == def.Name);
            if (existing == null)
            {
                context.Suppliers.Add(new Supplier
                {
                    Name = def.Name,
                    Country = def.Country,
                    OffersCustomisation = def.OffersCustomisation,
                    MinOrderQuantity = def.MinOrderQuantity,
                    LeadTimeDays = def.LeadTimeDays,
                    CreatedAt = DateTime.UtcNow,
                });
            }
            else
            {
                existing.Country = def.Country;
                existing.OffersCustomisation = def.OffersCustomisation;
                existing.MinOrderQuantity = def.MinOrderQuantity;
                existing.LeadTimeDays = def.LeadTimeDays;
            }
        }

        await context.SaveChangesAsync();
    }

    // ─── Customisation Options ───────────────────────────────────────────────

    private static async Task SeedCustomisationOptionsAsync(AppDbContext context)
    {
        var suppliers = await context.Suppliers.ToListAsync();

        // Charlie (SA) — full tiers for both types
        var charlie = suppliers.FirstOrDefault(s => s.Name == "Charlie Supplier (SA)");
        if (charlie != null)
        {
            await UpsertCustomisationTiersAsync(context, charlie.Id,
                silkScreen: new[]
                {
                    (100, 1500m), (250, 3250m), (500, 5750m), (1000, 11900m), (2500, 29500m),
                    (5000, 58000m), (10000, 110000m), (20000, 210000m), (50000, 500000m),
                },
                hotStamping: new[]
                {
                    (100, 1650m), (250, 3500m), (500, 6250m), (1000, 12500m), (2500, 32000m),
                    (5000, 62000m), (10000, 120000m), (20000, 228000m), (50000, 540000m),
                });
        }

        // Chinese suppliers — 2500+ tiers only
        var chineseTiersSilk = new[]
        {
            (2500, 29500m), (5000, 58000m), (10000, 110000m), (20000, 210000m), (50000, 500000m),
        };
        var chineseTiersHot = new[]
        {
            (2500, 32000m), (5000, 62000m), (10000, 120000m), (20000, 228000m), (50000, 540000m),
        };

        foreach (var s in suppliers.Where(s => s.Country == "China"))
        {
            await UpsertCustomisationTiersAsync(context, s.Id, chineseTiersSilk, chineseTiersHot);
        }

        await context.SaveChangesAsync();
    }

    private static async Task UpsertCustomisationTiersAsync(
        AppDbContext context,
        int supplierId,
        (int qty, decimal price)[] silkScreen,
        (int qty, decimal price)[] hotStamping)
    {
        var existing = await context.CustomisationOptions
            .Where(co => co.SupplierId == supplierId)
            .ToListAsync();

        foreach (var (qty, price) in silkScreen)
        {
            if (!existing.Any(co => co.Type == CustomisationType.SilkScreen && co.MinQuantity == qty))
                context.CustomisationOptions.Add(new CustomisationOption
                {
                    SupplierId = supplierId,
                    Type = CustomisationType.SilkScreen,
                    MinQuantity = qty,
                    TotalPriceZAR = price,
                });
        }

        foreach (var (qty, price) in hotStamping)
        {
            if (!existing.Any(co => co.Type == CustomisationType.HotStamping && co.MinQuantity == qty))
                context.CustomisationOptions.Add(new CustomisationOption
                {
                    SupplierId = supplierId,
                    Type = CustomisationType.HotStamping,
                    MinQuantity = qty,
                    TotalPriceZAR = price,
                });
        }
    }

    // ─── Products ────────────────────────────────────────────────────────────

    private static async Task SeedProductsAsync(AppDbContext context)
    {
        if (await context.Products.AnyAsync()) return;

        var hongxin = await context.Suppliers.FirstAsync(s => s.Name == "Hongxin Pharmaceutical");

        var productDefs = new List<ProductDef>
        {
            // Hongxin products
            new("Devin",   "Serum", 30, "Black",  "Black",  "Matte",   3.18m, 4.18m, 11.19404m,
                "https://detail.1688.com/offer/705340046271.html",
                new[] { (10, 16.79m, 200m), (50, 15.67m, 570m), (100, 15.11m, 1140m),
                        (250, 14.55m, 2850m), (500, 14.33m, 5700m), (1000, 13.99m, 11400m),
                        (2500, 13.66m, 28500m), (5000, 13.43m, 57000m), (10000, 12.87m, 114000m) }),
            new("Darla",   "Pump",  30, "Clear",  "White",  "Clear",   3.50m, 4.50m, 12.051m,   null, null),
            new("Delphi",  "Pump",  30, "Clear",  "White",  "Clear",   2.58m, 3.58m,  9.58724m, null, null),
            new("Dawn",    "Serum", 30, "Clear",  "Silver", "Clear",   2.15m, 3.15m,  8.4357m,  null, null),
            // Guangdong products
            new("Daphne",  "Jar",   30, "Clear",  "White",  "Clear",   3.88m, 4.88m, 13.06864m, null, null),
            new("Danica",  "Serum", 30, "Orange", "White",  "Frosted", 2.88m, 3.88m, 10.39064m, null, null),
            new("Aurora",  "Pump",  30, "Clear",  "White",  "Frosted", 3.50m, 4.50m, 12.051m,   null, null),
            new("Ava",     "Pump",  30, "Clear",  "White",  "Clear",   3.50m, 4.50m, 12.051m,   null, null),
            new("Demi",    "Serum", 30, "Black",  "Gold",   "Matte",   3.20m, 4.20m, 11.247m,   null, null),
            new("Esther",  "Jar",   30, "White",  "White",  "Frosted", 3.90m, 4.90m, 13.1257m,  null, null),
            new("Emma",    "Pump",  30, "White",  "White",  "Clear",   3.50m, 4.50m, 12.051m,   null, null),
            // Charlie (SA) products
            new("Charlie", "Pump",  30, "Clear",  "White",  "Clear",   3.50m, 4.50m, 12.051m,   null, null),
            new("Dakota",  "Serum", 40, "Black",  "Silver", "Matte",   4.00m, 5.00m, 13.385m,   null, null),
            new("Dahlia",  "Serum", 30, "Green",  "Green",  "Frosted", 3.00m, 4.00m, 10.71m,    null, null),
            new("Danika",  "Serum", 30, "Clear",  "Silver", "Frosted", 2.90m, 3.90m, 10.4437m,  null, null),
        };

        foreach (var def in productDefs)
        {
            var skuBase = BuildSku(def.Name, def.Category, def.SizeML, def.BottleColour, def.LidColour, def.Texture);
            var product = new Product
            {
                Name = def.Name,
                SKUBase = skuBase,
                Category = def.Category,
                SizeML = def.SizeML,
                BottleColour = def.BottleColour,
                LidColour = def.LidColour,
                Texture = def.Texture,
                CostCNY = def.CostCNY,
                CostWithShippingCNY = def.CostWithShippingCNY,
                CostPerUnitZAR = def.CostPerUnitZAR,
                SupplierLink = def.SupplierLink,
                SupplierId = hongxin.Id,  // will be corrected by UpdateProductSuppliersAsync
                IsActive = true,
            };
            context.Products.Add(product);
            await context.SaveChangesAsync();

            if (def.Tiers != null)
            {
                foreach (var (qty, sale, delivery) in def.Tiers)
                {
                    var profitPerUnit = sale - def.CostPerUnitZAR;
                    var markupPct = (sale / def.CostPerUnitZAR - 1m) * 100m;
                    var marginPct = profitPerUnit / sale * 100m;
                    context.PricingTiers.Add(new PricingTier
                    {
                        ProductId = product.Id,
                        SKU = $"{skuBase}-{qty}",
                        Quantity = qty,
                        MarkupPercent = Math.Round(markupPct, 2),
                        SalePricePerUnit = sale,
                        TotalSalePrice = sale * qty,
                        TotalCostPrice = def.CostPerUnitZAR * qty,
                        ProfitPerUnit = Math.Round(profitPerUnit, 5),
                        TotalProfit = Math.Round(profitPerUnit * qty, 2),
                        MarginPercent = Math.Round(marginPct, 2),
                        DeliveryCostZAR = delivery,
                    });
                }
            }

            foreach (var (location, onHand, isStocked) in new[]
            {
                ("Cape Town",    0,     false),
                ("China",        10000, true),
                ("ZQ Warehouse", 0,     false),
            })
            {
                context.InventoryItems.Add(new InventoryItem
                {
                    ProductId = product.Id,
                    SKU = skuBase,
                    Quantity = onHand,
                    Location = location,
                    OnHandStock = onHand,
                    AvailableStock = onHand,
                    IsStocked = isStocked,
                    UpdatedAt = DateTime.UtcNow,
                });
            }

            await context.SaveChangesAsync();
        }
    }

    // ─── Product → Supplier mapping ──────────────────────────────────────────

    private static async Task UpdateProductSuppliersAsync(AppDbContext context)
    {
        var products = await context.Products.ToListAsync();
        var suppliers = await context.Suppliers.ToListAsync();

        var hongxin   = suppliers.FirstOrDefault(s => s.Name == "Hongxin Pharmaceutical");
        var guangdong  = suppliers.FirstOrDefault(s => s.Name == "Guangdong Fuqi Packaging");
        var charlie    = suppliers.FirstOrDefault(s => s.Name == "Charlie Supplier (SA)");

        var hongxinNames   = new[] { "devin", "darla", "delphi", "dawn" };
        var guangdongNames = new[] { "daphne", "danica", "aurora", "ava", "demi", "esther", "emma" };
        var charlieNames   = new[] { "charlie", "dakota", "dahlia", "danika" };

        var changed = false;
        foreach (var product in products)
        {
            var lower = product.Name.ToLowerInvariant();
            int? targetId = null;

            if (hongxin != null && hongxinNames.Any(n => lower.Contains(n)))
                targetId = hongxin.Id;
            else if (guangdong != null && guangdongNames.Any(n => lower.Contains(n)))
                targetId = guangdong.Id;
            else if (charlie != null && charlieNames.Any(n => lower.Contains(n)))
                targetId = charlie.Id;

            if (targetId.HasValue && product.SupplierId != targetId.Value)
            {
                product.SupplierId = targetId.Value;
                changed = true;
            }
        }

        if (changed)
            await context.SaveChangesAsync();
    }

    // ─── ProductPricingTiers ─────────────────────────────────────────────────

    private static readonly int[] StandardQtys = { 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 20000, 50000 };

    private static readonly Dictionary<int, decimal> MarkupTable = new()
    {
        { 10,    50m }, { 50,    40m }, { 100,   35m }, { 250,   30m },
        { 500,   28m }, { 1000,  25m }, { 2500,  22m }, { 5000,  20m },
        { 10000, 15m }, { 20000, 12m }, { 50000, 10m },
    };

    private static async Task SeedProductPricingTiersAsync(AppDbContext context)
    {
        var products = await context.Products
            .Include(p => p.PricingTiers)
            .Include(p => p.ProductPricingTiers)
            .ToListAsync();

        foreach (var product in products)
        {
            if (product.ProductPricingTiers.Any()) continue;

            if (product.PricingTiers.Any())
            {
                // Derive from existing PricingTiers
                var sorted = product.PricingTiers.OrderBy(t => t.Quantity).ToList();

                foreach (var tier in sorted)
                {
                    context.ProductPricingTiers.Add(new ProductPricingTier
                    {
                        ProductId = product.Id,
                        Quantity = tier.Quantity,
                        SalePriceZAR = tier.TotalSalePrice,
                        DeliveryCostZAR = tier.DeliveryCostZAR,
                    });
                }

                // Derive per-unit delivery from highest existing tier
                var highest = sorted.Last();
                var deliveryPerUnit = highest.Quantity > 0
                    ? highest.DeliveryCostZAR / highest.Quantity
                    : 11.40m;

                context.ProductPricingTiers.Add(new ProductPricingTier
                {
                    ProductId = product.Id,
                    Quantity = 20000,
                    SalePriceZAR = Math.Round(product.CostPerUnitZAR * 1.12m * 20000m, 2),
                    DeliveryCostZAR = Math.Round(deliveryPerUnit * 20000m, 2),
                });
                context.ProductPricingTiers.Add(new ProductPricingTier
                {
                    ProductId = product.Id,
                    Quantity = 50000,
                    SalePriceZAR = Math.Round(product.CostPerUnitZAR * 1.10m * 50000m, 2),
                    DeliveryCostZAR = Math.Round(deliveryPerUnit * 50000m, 2),
                });
            }
            else
            {
                // No PricingTiers — generate all tiers from markup table
                foreach (var qty in StandardQtys)
                {
                    var markup = MarkupTable[qty];
                    var salePerUnit = Math.Round(product.CostPerUnitZAR * (1m + markup / 100m), 4);
                    var deliveryPerUnit = qty <= 10 ? 20m : 11.40m;

                    context.ProductPricingTiers.Add(new ProductPricingTier
                    {
                        ProductId = product.Id,
                        Quantity = qty,
                        SalePriceZAR = Math.Round(salePerUnit * qty, 2),
                        DeliveryCostZAR = Math.Round(deliveryPerUnit * qty, 2),
                    });
                }
            }

            await context.SaveChangesAsync();
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private static string BuildSku(string name, string category, int sizeML, string bottle, string lid, string texture)
    {
        static string Slug(string s) => s.ToLowerInvariant().Replace(" ", "-");
        return $"{Slug(name)}-{Slug(category)}-{sizeML}ml-{Slug(bottle)}-{Slug(lid)}-{Slug(texture)}";
    }

    private record ProductDef(
        string Name, string Category, int SizeML,
        string BottleColour, string LidColour, string Texture,
        decimal CostCNY, decimal CostWithShippingCNY, decimal CostPerUnitZAR,
        string? SupplierLink,
        (int qty, decimal sale, decimal delivery)[]? Tiers);
}
