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
        // Seed roles
        foreach (var role in new[] { "Admin", "Manager" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        // Seed default admin, reset password if already exists
        const string adminEmail = "admin@bdp.com";
        const string adminPassword = "Admin@123!";
        var existingAdmin = await userManager.FindByEmailAsync(adminEmail);
        if (existingAdmin == null)
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
            var token = await userManager.GeneratePasswordResetTokenAsync(existingAdmin);
            await userManager.ResetPasswordAsync(existingAdmin, token, adminPassword);
            if (!await userManager.IsInRoleAsync(existingAdmin, "Admin"))
                await userManager.AddToRoleAsync(existingAdmin, "Admin");
        }

        if (await context.Products.AnyAsync()) return;

        var supplier = await context.Suppliers.FirstOrDefaultAsync(s => s.Name == "Hongxin Pharmaceutical")
            ?? new Supplier { Name = "Hongxin Pharmaceutical", Platform = "1688.com", Country = "China" };
        if (supplier.Id == 0)
        {
            context.Suppliers.Add(supplier);
            await context.SaveChangesAsync();
        }

        var productDefs = new List<ProductDef>
        {
            new("Devin",   "Serum",  30, "Black",  "Black",  "Matte",    3.18m,  4.18m,  11.19404m,
                "https://detail.1688.com/offer/705340046271.html",
                new[]
                {
                    (10,    16.79m, 200m),
                    (50,    15.67m, 570m),
                    (100,   15.11m, 1140m),
                    (250,   14.55m, 2850m),
                    (500,   14.33m, 5700m),
                    (1000,  13.99m, 11400m),
                    (2500,  13.66m, 28500m),
                    (5000,  13.43m, 57000m),
                    (10000, 12.87m, 114000m),
                }),
            new("Darla",   "Pump",   30, "Clear",  "White",  "Clear",    3.50m,  4.50m,  12.051m,   null, null),
            new("Delphi",  "Pump",   30, "Clear",  "White",  "Clear",    2.58m,  3.58m,  9.58724m,  null, null),
            new("Danica",  "Serum",  30, "Orange", "White",  "Frosted",  2.88m,  3.88m,  10.39064m, null, null),
            new("Aurora",  "Pump",   30, "Clear",  "White",  "Frosted",  3.50m,  4.50m,  12.051m,   null, null),
            new("Daphne",  "Jar",    30, "Clear",  "White",  "Clear",    3.88m,  4.88m,  13.06864m, null, null),
            new("Dawn",    "Serum",  30, "Clear",  "Silver", "Clear",    2.15m,  3.15m,  8.4357m,   null, null),
            new("Charlie", "Pump",   30, "Clear",  "White",  "Clear",    3.50m,  4.50m,  12.051m,   null, null),
            new("Dakota",  "Serum",  40, "Black",  "Silver", "Matte",    4.00m,  5.00m,  13.385m,   null, null),
            new("Dahlia",  "Serum",  30, "Green",  "Green",  "Frosted",  3.00m,  4.00m,  10.71m,    null, null),
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
                SupplierId = supplier.Id,
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
