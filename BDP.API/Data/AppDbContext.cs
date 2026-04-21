using BDP.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace BDP.API.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<PricingTier> PricingTiers => Set<PricingTier>();
    public DbSet<ProductPricingTier> ProductPricingTiers => Set<ProductPricingTier>();
    public DbSet<CustomisationOption> CustomisationOptions => Set<CustomisationOption>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShipmentItem> ShipmentItems => Set<ShipmentItem>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<ShippingSettings> ShippingSettings => Set<ShippingSettings>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Supplier → Products (restrict delete)
        builder.Entity<Product>()
            .HasOne(p => p.Supplier)
            .WithMany(s => s.Products)
            .HasForeignKey(p => p.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        // Product → PricingTiers
        builder.Entity<PricingTier>()
            .HasOne(pt => pt.Product)
            .WithMany(p => p.PricingTiers)
            .HasForeignKey(pt => pt.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // Product → ProductPricingTiers
        builder.Entity<ProductPricingTier>()
            .HasOne(ppt => ppt.Product)
            .WithMany(p => p.ProductPricingTiers)
            .HasForeignKey(ppt => ppt.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // Supplier → CustomisationOptions
        builder.Entity<CustomisationOption>()
            .HasOne(co => co.Supplier)
            .WithMany(s => s.CustomisationOptions)
            .HasForeignKey(co => co.SupplierId)
            .OnDelete(DeleteBehavior.Cascade);

        // Supplier → Shipments (restrict)
        builder.Entity<Shipment>()
            .HasOne(sh => sh.Supplier)
            .WithMany(s => s.Shipments)
            .HasForeignKey(sh => sh.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        // Shipment → ShipmentItems
        builder.Entity<ShipmentItem>()
            .HasOne(si => si.Shipment)
            .WithMany(sh => sh.Items)
            .HasForeignKey(si => si.ShipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        // ShipmentItem → Product (restrict)
        builder.Entity<ShipmentItem>()
            .HasOne(si => si.Product)
            .WithMany()
            .HasForeignKey(si => si.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // Product → InventoryItems
        builder.Entity<InventoryItem>()
            .HasOne(ii => ii.Product)
            .WithMany(p => p.InventoryItems)
            .HasForeignKey(ii => ii.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // Customer → Orders
        builder.Entity<Order>()
            .HasOne(o => o.Customer)
            .WithMany(c => c.Orders)
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        // Order → OrderItems
        builder.Entity<OrderItem>()
            .HasOne(oi => oi.Order)
            .WithMany(o => o.OrderItems)
            .HasForeignKey(oi => oi.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // OrderItem → Product
        builder.Entity<OrderItem>()
            .HasOne(oi => oi.Product)
            .WithMany()
            .HasForeignKey(oi => oi.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // Decimal precision — Product
        builder.Entity<Product>()
            .Property(p => p.CostCNY).HasPrecision(18, 4);
        builder.Entity<Product>()
            .Property(p => p.CostWithShippingCNY).HasPrecision(18, 4);
        builder.Entity<Product>()
            .Property(p => p.CostPerUnitZAR).HasPrecision(18, 4);
        builder.Entity<Product>()
            .Property(p => p.WeightKg).HasPrecision(10, 4);
        builder.Entity<Product>()
            .Property(p => p.LengthCm).HasPrecision(10, 2);
        builder.Entity<Product>()
            .Property(p => p.WidthCm).HasPrecision(10, 2);
        builder.Entity<Product>()
            .Property(p => p.HeightCm).HasPrecision(10, 2);
        builder.Entity<Product>()
            .Property(p => p.VolumeCBM).HasPrecision(18, 9);

        // Decimal precision — PricingTier
        builder.Entity<PricingTier>()
            .Property(pt => pt.MarkupPercent).HasPrecision(18, 4);
        builder.Entity<PricingTier>()
            .Property(pt => pt.SalePricePerUnit).HasPrecision(18, 4);
        builder.Entity<PricingTier>()
            .Property(pt => pt.TotalSalePrice).HasPrecision(18, 4);
        builder.Entity<PricingTier>()
            .Property(pt => pt.TotalCostPrice).HasPrecision(18, 4);
        builder.Entity<PricingTier>()
            .Property(pt => pt.ProfitPerUnit).HasPrecision(18, 4);
        builder.Entity<PricingTier>()
            .Property(pt => pt.TotalProfit).HasPrecision(18, 4);
        builder.Entity<PricingTier>()
            .Property(pt => pt.MarginPercent).HasPrecision(18, 4);
        builder.Entity<PricingTier>()
            .Property(pt => pt.LogoSilkScreen).HasPrecision(18, 4);
        builder.Entity<PricingTier>()
            .Property(pt => pt.LogoHotStamping).HasPrecision(18, 4);
        builder.Entity<PricingTier>()
            .Property(pt => pt.DeliveryCostZAR).HasPrecision(18, 4);

        // Decimal precision — ProductPricingTier
        builder.Entity<ProductPricingTier>()
            .Property(ppt => ppt.SalePriceZAR).HasPrecision(18, 4);
        builder.Entity<ProductPricingTier>()
            .Property(ppt => ppt.DeliveryCostZAR).HasPrecision(18, 4);

        // Decimal precision — CustomisationOption
        builder.Entity<CustomisationOption>()
            .Property(co => co.TotalPriceZAR).HasPrecision(18, 4);

        // Decimal precision — Shipment
        builder.Entity<Shipment>()
            .Property(sh => sh.SeaFreightCostZAR).HasPrecision(18, 4);
        builder.Entity<Shipment>()
            .Property(sh => sh.CustomsDutyZAR).HasPrecision(18, 4);

        // Decimal precision — ShipmentItem
        builder.Entity<ShipmentItem>()
            .Property(si => si.CostPerUnitZAR).HasPrecision(18, 4);
        builder.Entity<ShipmentItem>()
            .Property(si => si.TotalCostZAR).HasPrecision(18, 4);

        // Decimal precision — Order/OrderItem
        builder.Entity<Order>()
            .Property(o => o.TotalAmountZAR).HasPrecision(18, 4);
        builder.Entity<OrderItem>()
            .Property(oi => oi.UnitPriceZAR).HasPrecision(18, 4);
        builder.Entity<OrderItem>()
            .Property(oi => oi.TotalPriceZAR).HasPrecision(18, 4);
        builder.Entity<OrderItem>()
            .Property(oi => oi.BrandingCostZAR).HasPrecision(18, 4);

        // Decimal precision — ShippingSettings
        builder.Entity<ShippingSettings>()
            .Property(ss => ss.CnyPerCbm).HasPrecision(18, 4);
        builder.Entity<ShippingSettings>()
            .Property(ss => ss.CnyPerKg).HasPrecision(18, 4);
        builder.Entity<ShippingSettings>()
            .Property(ss => ss.CnyToZarRate).HasPrecision(18, 4);

        SeedData(builder);
    }

    private static void SeedData(ModelBuilder builder)
    {
        var adminId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
        var hasher = new PasswordHasher<ApplicationUser>();
        var adminUser = new ApplicationUser
        {
            Id = adminId,
            UserName = "admin@bdp.co.za",
            NormalizedUserName = "ADMIN@BDP.CO.ZA",
            Email = "admin@bdp.co.za",
            NormalizedEmail = "ADMIN@BDP.CO.ZA",
            EmailConfirmed = true,
            FirstName = "BDP",
            LastName = "Admin",
            Role = "Admin",
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            SecurityStamp = "STATIC_SECURITY_STAMP_BDP_ADMIN_2026"
        };
        adminUser.PasswordHash = hasher.HashPassword(adminUser, "BDP@Admin2026!");
        builder.Entity<ApplicationUser>().HasData(adminUser);

        builder.Entity<ShippingSettings>().HasData(new ShippingSettings
        {
            Id = 1,
            CnyPerCbm = 2000m,
            CnyPerKg = 10m,
            CnyToZarRate = 2.40m,
            Notes = "Sea DDP China to customer",
        });
    }
}
