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
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductPricingTier> ProductPricingTiers => Set<ProductPricingTier>();
    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<ProductCollection> ProductCollections => Set<ProductCollection>();
    public DbSet<CustomisationOption> CustomisationOptions => Set<CustomisationOption>();
    public DbSet<CustomisationPricingTier> CustomisationPricingTiers => Set<CustomisationPricingTier>();
    public DbSet<CustomisationSetting> CustomisationSettings => Set<CustomisationSetting>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShipmentItem> ShipmentItems => Set<ShipmentItem>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<RecurringOrder> RecurringOrders => Set<RecurringOrder>();
    public DbSet<RecurringOrderItem> RecurringOrderItems => Set<RecurringOrderItem>();
    public DbSet<ShippingSettings> ShippingSettings => Set<ShippingSettings>();
    public DbSet<ShippingRate> ShippingRates => Set<ShippingRate>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<CustomerAddress> CustomerAddresses => Set<CustomerAddress>();
    public DbSet<CartItemArtwork> CartItemArtworks => Set<CartItemArtwork>();
    public DbSet<OrderItemArtwork> OrderItemArtworks => Set<OrderItemArtwork>();
    public DbSet<CurrencyRate> CurrencyRates => Set<CurrencyRate>();
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Supplier → Products
        builder.Entity<Product>()
            .HasOne(p => p.Supplier)
            .WithMany(s => s.Products)
            .HasForeignKey(p => p.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        // Product → ProductVariants
        builder.Entity<ProductVariant>()
            .HasOne(pv => pv.Product)
            .WithMany(p => p.Variants)
            .HasForeignKey(pv => pv.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // Product → ProductImages
        builder.Entity<ProductImage>()
            .HasOne(pi => pi.Product)
            .WithMany(p => p.Images)
            .HasForeignKey(pi => pi.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // ProductVariant → ProductPricingTiers
        builder.Entity<ProductPricingTier>()
            .HasOne(ppt => ppt.ProductVariant)
            .WithMany(pv => pv.PricingTiers)
            .HasForeignKey(ppt => ppt.ProductVariantId)
            .OnDelete(DeleteBehavior.Cascade);

        // Product ↔ Collection (many-to-many via ProductCollection)
        builder.Entity<ProductCollection>()
            .HasKey(pc => new { pc.ProductId, pc.CollectionId });

        builder.Entity<ProductCollection>()
            .HasOne(pc => pc.Product)
            .WithMany(p => p.ProductCollections)
            .HasForeignKey(pc => pc.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<ProductCollection>()
            .HasOne(pc => pc.Collection)
            .WithMany(c => c.ProductCollections)
            .HasForeignKey(pc => pc.CollectionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Supplier → CustomisationOptions
        builder.Entity<CustomisationOption>()
            .HasOne(co => co.Supplier)
            .WithMany(s => s.CustomisationOptions)
            .HasForeignKey(co => co.SupplierId)
            .OnDelete(DeleteBehavior.Cascade);

        // CustomisationOption → CustomisationPricingTiers
        builder.Entity<CustomisationPricingTier>()
            .HasOne(cpt => cpt.CustomisationOption)
            .WithMany(co => co.PricingTiers)
            .HasForeignKey(cpt => cpt.CustomisationOptionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Supplier → Shipments
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

        // ShipmentItem → Product
        builder.Entity<ShipmentItem>()
            .HasOne(si => si.Product)
            .WithMany()
            .HasForeignKey(si => si.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // Client → Orders (nullable FK — storefront orders may have no client)
        builder.Entity<Order>()
            .HasOne(o => o.Client)
            .WithMany(c => c.Orders)
            .HasForeignKey(o => o.ClientId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // Cart → CartItems
        builder.Entity<CartItem>()
            .HasOne(ci => ci.Cart)
            .WithMany(c => c.Items)
            .HasForeignKey(ci => ci.CartId)
            .OnDelete(DeleteBehavior.Cascade);

        // CartItem → ProductVariant
        builder.Entity<CartItem>()
            .HasOne(ci => ci.ProductVariant)
            .WithMany()
            .HasForeignKey(ci => ci.ProductVariantId)
            .OnDelete(DeleteBehavior.Restrict);

        // CartItemArtwork → CartItem
        builder.Entity<CartItemArtwork>()
            .HasOne(a => a.CartItem).WithMany(ci => ci.Artworks)
            .HasForeignKey(a => a.CartItemId)
            .OnDelete(DeleteBehavior.Cascade);

        // OrderItemArtwork → OrderItem
        builder.Entity<OrderItemArtwork>()
            .HasOne(a => a.OrderItem).WithMany()
            .HasForeignKey(a => a.OrderItemId)
            .OnDelete(DeleteBehavior.Cascade);

        // CartItem → CustomisationOption
        builder.Entity<CartItem>()
            .HasOne(ci => ci.CustomisationOption)
            .WithMany()
            .HasForeignKey(ci => ci.CustomisationOptionId)
            .OnDelete(DeleteBehavior.SetNull);

        // Client → RecurringOrders
        builder.Entity<RecurringOrder>()
            .HasOne(ro => ro.Client)
            .WithMany(c => c.RecurringOrders)
            .HasForeignKey(ro => ro.ClientId)
            .OnDelete(DeleteBehavior.Restrict);

        // RecurringOrder → GeneratedOrders
        builder.Entity<Order>()
            .HasOne(o => o.RecurringOrder)
            .WithMany(ro => ro.GeneratedOrders)
            .HasForeignKey(o => o.RecurringOrderId)
            .OnDelete(DeleteBehavior.SetNull);

        // RecurringOrder → RecurringOrderItems
        builder.Entity<RecurringOrderItem>()
            .HasOne(roi => roi.RecurringOrder)
            .WithMany(ro => ro.Items)
            .HasForeignKey(roi => roi.RecurringOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // RecurringOrderItem → ProductVariant
        builder.Entity<RecurringOrderItem>()
            .HasOne(roi => roi.ProductVariant)
            .WithMany()
            .HasForeignKey(roi => roi.ProductVariantId)
            .OnDelete(DeleteBehavior.Restrict);

        // RecurringOrderItem → CustomisationOption
        builder.Entity<RecurringOrderItem>()
            .HasOne(roi => roi.CustomisationOption)
            .WithMany()
            .HasForeignKey(roi => roi.CustomisationOptionId)
            .OnDelete(DeleteBehavior.SetNull);

        // Order → Items
        builder.Entity<OrderItem>()
            .HasOne(oi => oi.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(oi => oi.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // OrderItem → ProductVariant
        builder.Entity<OrderItem>()
            .HasOne(oi => oi.ProductVariant)
            .WithMany()
            .HasForeignKey(oi => oi.ProductVariantId)
            .OnDelete(DeleteBehavior.Restrict);

        // OrderItem → PricingTier
        builder.Entity<OrderItem>()
            .HasOne(oi => oi.PricingTier)
            .WithMany()
            .HasForeignKey(oi => oi.PricingTierId)
            .OnDelete(DeleteBehavior.Restrict);

        // OrderItem → CustomisationOption
        builder.Entity<OrderItem>()
            .HasOne(oi => oi.CustomisationOption)
            .WithMany()
            .HasForeignKey(oi => oi.CustomisationOptionId)
            .OnDelete(DeleteBehavior.SetNull);

        // OrderItem → CustomisationPricingTier
        builder.Entity<OrderItem>()
            .HasOne(oi => oi.CustomisationPricingTier)
            .WithMany()
            .HasForeignKey(oi => oi.CustomisationPricingTierId)
            .OnDelete(DeleteBehavior.SetNull);

        // Order → Invoices
        builder.Entity<Invoice>()
            .HasOne(i => i.Order)
            .WithMany(o => o.Invoices)
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        // Client → Invoices
        builder.Entity<Invoice>()
            .HasOne(i => i.Client)
            .WithMany()
            .HasForeignKey(i => i.ClientId)
            .OnDelete(DeleteBehavior.Restrict);

        // Decimal precision — Product
        builder.Entity<Product>()
            .Property(p => p.WeightKg).HasPrecision(10, 4);
        builder.Entity<Product>()
            .Property(p => p.LengthCm).HasPrecision(10, 2);
        builder.Entity<Product>()
            .Property(p => p.WidthCm).HasPrecision(10, 2);
        builder.Entity<Product>()
            .Property(p => p.HeightCm).HasPrecision(10, 2);

        // Decimal precision — ProductPricingTier
        builder.Entity<ProductPricingTier>()
            .Property(ppt => ppt.CostCNY).HasPrecision(18, 4);
        builder.Entity<ProductPricingTier>()
            .Property(ppt => ppt.CostWithShippingCNY).HasPrecision(18, 4);
        builder.Entity<ProductPricingTier>()
            .Property(ppt => ppt.CostWithDutiesCNY).HasPrecision(18, 4);
        builder.Entity<ProductPricingTier>()
            .Property(ppt => ppt.CostPerUnitZAR).HasPrecision(18, 4);
        builder.Entity<ProductPricingTier>()
            .Property(ppt => ppt.SalePriceZAR).HasPrecision(18, 4);

        // Decimal precision — CustomisationPricingTier
        builder.Entity<CustomisationPricingTier>()
            .Property(cpt => cpt.CostCNY).HasPrecision(18, 4);
        builder.Entity<CustomisationPricingTier>()
            .Property(cpt => cpt.CostWithShippingCNY).HasPrecision(18, 4);
        builder.Entity<CustomisationPricingTier>()
            .Property(cpt => cpt.CostPerUnitZAR).HasPrecision(18, 4);
        builder.Entity<CustomisationPricingTier>()
            .Property(cpt => cpt.SalePriceZAR).HasPrecision(18, 4);

        // Decimal precision — CustomisationSetting
        builder.Entity<CustomisationSetting>()
            .Property(cs => cs.PricePerUnitZAR).HasPrecision(18, 4);

        // Decimal precision — Client
        builder.Entity<Client>()
            .Property(c => c.CreditLimit).HasPrecision(18, 2);

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

        // Decimal precision — Order
        builder.Entity<Order>()
            .Property(o => o.SubtotalZAR).HasPrecision(18, 4);
        builder.Entity<Order>()
            .Property(o => o.ShippingCostZAR).HasPrecision(18, 4);
        builder.Entity<Order>()
            .Property(o => o.TotalZAR).HasPrecision(18, 4);

        // Decimal precision — OrderItem
        builder.Entity<OrderItem>()
            .Property(oi => oi.UnitPriceZAR).HasPrecision(18, 4);
        builder.Entity<OrderItem>()
            .Property(oi => oi.LineTotal).HasPrecision(18, 4);
        builder.Entity<OrderItem>()
            .Property(oi => oi.CustomisationCostZAR).HasPrecision(18, 4);
        builder.Entity<OrderItem>()
            .Property(oi => oi.ShippingCostZAR).HasPrecision(18, 4);

        // Decimal precision — Invoice
        builder.Entity<Invoice>()
            .Property(i => i.SubtotalZAR).HasPrecision(18, 4);
        builder.Entity<Invoice>()
            .Property(i => i.VatZAR).HasPrecision(18, 4);
        builder.Entity<Invoice>()
            .Property(i => i.TotalZAR).HasPrecision(18, 4);

        // Decimal precision — ProductVariant (catalogue fields)
        builder.Entity<ProductVariant>()
            .Property(pv => pv.UnitPriceCNY).HasPrecision(18, 4);

        // Decimal precision — ShippingSettings
        builder.Entity<ShippingSettings>()
            .Property(ss => ss.CnyPerCbm).HasPrecision(18, 4);
        builder.Entity<ShippingSettings>()
            .Property(ss => ss.CnyPerKg).HasPrecision(18, 4);
        builder.Entity<ShippingSettings>()
            .Property(ss => ss.CnyToZarRate).HasPrecision(18, 4);
        builder.Entity<ShippingSettings>()
            .Property(ss => ss.BufferCNY).HasPrecision(18, 4);
        builder.Entity<ShippingSettings>()
            .Property(ss => ss.ProfitCNY).HasPrecision(18, 4);

        // Decimal precision — ShippingRate
        builder.Entity<ShippingRate>().Property(r => r.RatePerKg).HasPrecision(18, 4);
        builder.Entity<ShippingRate>().Property(r => r.RatePerCbm).HasPrecision(18, 2);
        builder.Entity<ShippingRate>().Property(r => r.FuelSurchargePercent).HasPrecision(8, 2);
        builder.Entity<ShippingRate>().Property(r => r.DutyRatePercent).HasPrecision(8, 2);
        builder.Entity<ShippingRate>().Property(r => r.VatRatePercent).HasPrecision(8, 2);
        builder.Entity<ShippingRate>().Property(r => r.HandlingFeeZAR).HasPrecision(18, 2);
        builder.Entity<ShippingRate>().Property(r => r.MinimumChargeZAR).HasPrecision(18, 2);
        builder.Entity<ShippingRate>().Property(r => r.ExchangeRateCNYToZAR).HasPrecision(10, 4);
        builder.Entity<ShippingRate>()
            .HasIndex(r => new { r.Country, r.ShippingType })
            .IsUnique();

        // Decimal precision — CurrencyRate
        builder.Entity<CurrencyRate>()
            .Property(cr => cr.RateFromZAR).HasPrecision(18, 8);
        builder.Entity<CurrencyRate>()
            .HasIndex(cr => cr.Code).IsUnique();

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
            BufferCNY = 3.00m,
            ProfitCNY = 1.00m,
            UpdatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        });
    }
}
