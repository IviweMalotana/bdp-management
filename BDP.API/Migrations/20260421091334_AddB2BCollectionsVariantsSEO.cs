using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BDP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddB2BCollectionsVariantsSEO : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Clear tables whose FK targets are being replaced or restructured
            migrationBuilder.Sql("DELETE FROM \"OrderItems\";");
            migrationBuilder.Sql("DELETE FROM \"Orders\";");
            migrationBuilder.Sql("DELETE FROM \"ProductPricingTiers\";");
            migrationBuilder.Sql("DELETE FROM \"CustomisationOptions\";");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_Products_ProductId",
                table: "OrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Customers_CustomerId",
                table: "Orders");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductPricingTiers_Products_ProductId",
                table: "ProductPricingTiers");

            migrationBuilder.DropTable(
                name: "InventoryItems");

            migrationBuilder.DropTable(
                name: "PricingTiers");

            migrationBuilder.DropColumn(
                name: "LeadTimeDays",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "MinOrderQuantity",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "OriginCountry",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "CostCNY",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "CostPerUnitZAR",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "CostWithShippingCNY",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SizeML",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "SKU",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "TotalPriceZAR",
                table: "CustomisationOptions");

            migrationBuilder.RenameColumn(
                name: "Website",
                table: "Suppliers",
                newName: "Address");

            migrationBuilder.RenameColumn(
                name: "OffersCustomisation",
                table: "Suppliers",
                newName: "SuppliesCustomisation");

            migrationBuilder.RenameColumn(
                name: "FreightCostZAR",
                table: "Shipments",
                newName: "SeaFreightCostZAR");

            migrationBuilder.RenameColumn(
                name: "Texture",
                table: "Products",
                newName: "Slug");

            migrationBuilder.RenameColumn(
                name: "SupplierLink",
                table: "Products",
                newName: "UsageSuitability");

            migrationBuilder.RenameColumn(
                name: "ShopifyTitle",
                table: "Products",
                newName: "Link1688");

            migrationBuilder.RenameColumn(
                name: "ShopifyBodyHtml",
                table: "Products",
                newName: "Description");

            migrationBuilder.RenameColumn(
                name: "SKUBase",
                table: "Products",
                newName: "MetaTitle");

            migrationBuilder.RenameColumn(
                name: "LidColour",
                table: "Products",
                newName: "MetaKeywords");

            migrationBuilder.RenameColumn(
                name: "DateAdded",
                table: "Products",
                newName: "UpdatedAt");

            migrationBuilder.RenameColumn(
                name: "BottleColour",
                table: "Products",
                newName: "MetaDescription");

            migrationBuilder.RenameColumn(
                name: "ProductId",
                table: "ProductPricingTiers",
                newName: "ProductVariantId");

            migrationBuilder.RenameColumn(
                name: "DeliveryCostZAR",
                table: "ProductPricingTiers",
                newName: "CostWithShippingCNY");

            migrationBuilder.RenameIndex(
                name: "IX_ProductPricingTiers_ProductId",
                table: "ProductPricingTiers",
                newName: "IX_ProductPricingTiers_ProductVariantId");

            migrationBuilder.RenameColumn(
                name: "TotalAmountZAR",
                table: "Orders",
                newName: "TotalZAR");

            migrationBuilder.RenameColumn(
                name: "EstimatedDeliveryDate",
                table: "Orders",
                newName: "ShippedDate");

            migrationBuilder.RenameColumn(
                name: "CustomerId",
                table: "Orders",
                newName: "ClientId");

            migrationBuilder.RenameColumn(
                name: "BrandingType",
                table: "Orders",
                newName: "PaystackPaymentReference");

            migrationBuilder.RenameIndex(
                name: "IX_Orders_CustomerId",
                table: "Orders",
                newName: "IX_Orders_ClientId");

            migrationBuilder.RenameColumn(
                name: "TotalPriceZAR",
                table: "OrderItems",
                newName: "ShippingCostZAR");

            migrationBuilder.RenameColumn(
                name: "ProductId",
                table: "OrderItems",
                newName: "ProductVariantId");

            migrationBuilder.RenameColumn(
                name: "BrandingCostZAR",
                table: "OrderItems",
                newName: "LineTotal");

            migrationBuilder.RenameIndex(
                name: "IX_OrderItems_ProductId",
                table: "OrderItems",
                newName: "IX_OrderItems_ProductVariantId");

            migrationBuilder.RenameColumn(
                name: "Notes",
                table: "CustomisationOptions",
                newName: "Link1688");

            migrationBuilder.RenameColumn(
                name: "MinQuantity",
                table: "CustomisationOptions",
                newName: "MinimumQuantity");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Suppliers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SuppliesBottles",
                table: "Suppliers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "CustomerEmail",
                table: "Shipments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerName",
                table: "Shipments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DestinationAddress",
                table: "Shipments",
                type: "text",
                nullable: true);

            // These columns already exist from RefactorShippingDirectFromChina migration
            migrationBuilder.Sql("ALTER TABLE \"Products\" ADD COLUMN IF NOT EXISTS \"HeightCm\" numeric(10,2) NOT NULL DEFAULT 0;");
            migrationBuilder.Sql("ALTER TABLE \"Products\" ADD COLUMN IF NOT EXISTS \"LengthCm\" numeric(10,2) NOT NULL DEFAULT 0;");
            migrationBuilder.Sql("ALTER TABLE \"Products\" ADD COLUMN IF NOT EXISTS \"WeightKg\" numeric(10,4) NOT NULL DEFAULT 0;");
            migrationBuilder.Sql("ALTER TABLE \"Products\" ADD COLUMN IF NOT EXISTS \"WidthCm\" numeric(10,2) NOT NULL DEFAULT 0;");

            migrationBuilder.AddColumn<decimal>(
                name: "CostCNY",
                table: "ProductPricingTiers",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CostPerUnitZAR",
                table: "ProductPricingTiers",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CostWithDutiesCNY",
                table: "ProductPricingTiers",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "SKU",
                table: "ProductPricingTiers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeliveredDate",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPaid",
                table: "Orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PaidAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RecurringOrderId",
                table: "Orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RequiredByDate",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ShippingCostZAR",
                table: "Orders",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "SubtotalZAR",
                table: "Orders",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CustomisationCostZAR",
                table: "OrderItems",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "CustomisationOptionId",
                table: "OrderItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CustomisationPricingTierId",
                table: "OrderItems",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PricingTierId",
                table: "OrderItems",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "CustomisationOptions",
                type: "text",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.CreateTable(
                name: "Clients",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompanyName = table.Column<string>(type: "text", nullable: false),
                    TradingName = table.Column<string>(type: "text", nullable: true),
                    CompanyRegistrationNumber = table.Column<string>(type: "text", nullable: true),
                    VatNumber = table.Column<string>(type: "text", nullable: true),
                    ContactPersonName = table.Column<string>(type: "text", nullable: false),
                    ContactEmail = table.Column<string>(type: "text", nullable: false),
                    ContactPhone = table.Column<string>(type: "text", nullable: true),
                    BillingAddress = table.Column<string>(type: "text", nullable: true),
                    ShippingAddress = table.Column<string>(type: "text", nullable: true),
                    Industry = table.Column<string>(type: "text", nullable: true),
                    PaystackCustomerId = table.Column<string>(type: "text", nullable: true),
                    CreditLimit = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentTermsDays = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clients", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Collections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    MetaTitle = table.Column<string>(type: "text", nullable: false),
                    MetaDescription = table.Column<string>(type: "text", nullable: false),
                    MetaKeywords = table.Column<string>(type: "text", nullable: false),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Collections", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CustomisationPricingTiers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomisationOptionId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    CostCNY = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CostWithShippingCNY = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CostPerUnitZAR = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SalePriceZAR = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    SKU = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomisationPricingTiers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomisationPricingTiers_CustomisationOptions_Customisatio~",
                        column: x => x.CustomisationOptionId,
                        principalTable: "CustomisationOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductImages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    AltText = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductImages_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductVariants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    Size = table.Column<string>(type: "text", nullable: false),
                    BottleColour = table.Column<string>(type: "text", nullable: false),
                    LidColour = table.Column<string>(type: "text", nullable: false),
                    Texture = table.Column<string>(type: "text", nullable: false),
                    SKU = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductVariants_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShippingSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CnyPerCbm = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CnyPerKg = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CnyToZarRate = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShippingSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Invoices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    InvoiceNumber = table.Column<string>(type: "text", nullable: false),
                    OrderId = table.Column<int>(type: "integer", nullable: false),
                    ClientId = table.Column<int>(type: "integer", nullable: false),
                    InvoiceDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SubtotalZAR = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    VatZAR = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalZAR = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    PdfUrl = table.Column<string>(type: "text", nullable: true),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PaystackPaymentRequestId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Invoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Invoices_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Invoices_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RecurringOrders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ClientId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Frequency = table.Column<string>(type: "text", nullable: false),
                    FrequencyDays = table.Column<int>(type: "integer", nullable: false),
                    ContractStartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ContractEndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NextOrderDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecurringOrders_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProductCollections",
                columns: table => new
                {
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    CollectionId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductCollections", x => new { x.ProductId, x.CollectionId });
                    table.ForeignKey(
                        name: "FK_ProductCollections_Collections_CollectionId",
                        column: x => x.CollectionId,
                        principalTable: "Collections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProductCollections_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecurringOrderItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RecurringOrderId = table.Column<int>(type: "integer", nullable: false),
                    ProductVariantId = table.Column<int>(type: "integer", nullable: false),
                    CustomisationOptionId = table.Column<int>(type: "integer", nullable: true),
                    Quantity = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringOrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecurringOrderItems_CustomisationOptions_CustomisationOptio~",
                        column: x => x.CustomisationOptionId,
                        principalTable: "CustomisationOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_RecurringOrderItems_ProductVariants_ProductVariantId",
                        column: x => x.ProductVariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RecurringOrderItems_RecurringOrders_RecurringOrderId",
                        column: x => x.RecurringOrderId,
                        principalTable: "RecurringOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "ConcurrencyStamp", "PasswordHash" },
                values: new object[] { "4effb38b-6210-4f45-a6ed-87d71de87504", "AQAAAAIAAYagAAAAEKSr8XujulKhAM/sZmb2wNXXrKKjSGT6tFkP4+XO0ZAAJWrZyIkO6QTZ9f9LpHINIA==" });

            migrationBuilder.InsertData(
                table: "ShippingSettings",
                columns: new[] { "Id", "CnyPerCbm", "CnyPerKg", "CnyToZarRate", "UpdatedAt" },
                values: new object[] { 1, 2000m, 10m, 2.40m, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.CreateIndex(
                name: "IX_Orders_RecurringOrderId",
                table: "Orders",
                column: "RecurringOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_CustomisationOptionId",
                table: "OrderItems",
                column: "CustomisationOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_CustomisationPricingTierId",
                table: "OrderItems",
                column: "CustomisationPricingTierId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_PricingTierId",
                table: "OrderItems",
                column: "PricingTierId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomisationPricingTiers_CustomisationOptionId",
                table: "CustomisationPricingTiers",
                column: "CustomisationOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_ClientId",
                table: "Invoices",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_OrderId",
                table: "Invoices",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductCollections_CollectionId",
                table: "ProductCollections",
                column: "CollectionId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductImages_ProductId",
                table: "ProductImages",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariants_ProductId",
                table: "ProductVariants",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringOrderItems_CustomisationOptionId",
                table: "RecurringOrderItems",
                column: "CustomisationOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringOrderItems_ProductVariantId",
                table: "RecurringOrderItems",
                column: "ProductVariantId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringOrderItems_RecurringOrderId",
                table: "RecurringOrderItems",
                column: "RecurringOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_RecurringOrders_ClientId",
                table: "RecurringOrders",
                column: "ClientId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_CustomisationOptions_CustomisationOptionId",
                table: "OrderItems",
                column: "CustomisationOptionId",
                principalTable: "CustomisationOptions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_CustomisationPricingTiers_CustomisationPricingTi~",
                table: "OrderItems",
                column: "CustomisationPricingTierId",
                principalTable: "CustomisationPricingTiers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_ProductPricingTiers_PricingTierId",
                table: "OrderItems",
                column: "PricingTierId",
                principalTable: "ProductPricingTiers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_ProductVariants_ProductVariantId",
                table: "OrderItems",
                column: "ProductVariantId",
                principalTable: "ProductVariants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Clients_ClientId",
                table: "Orders",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_RecurringOrders_RecurringOrderId",
                table: "Orders",
                column: "RecurringOrderId",
                principalTable: "RecurringOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_ProductPricingTiers_ProductVariants_ProductVariantId",
                table: "ProductPricingTiers",
                column: "ProductVariantId",
                principalTable: "ProductVariants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_CustomisationOptions_CustomisationOptionId",
                table: "OrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_CustomisationPricingTiers_CustomisationPricingTi~",
                table: "OrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_ProductPricingTiers_PricingTierId",
                table: "OrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_ProductVariants_ProductVariantId",
                table: "OrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_Orders_Clients_ClientId",
                table: "Orders");

            migrationBuilder.DropForeignKey(
                name: "FK_Orders_RecurringOrders_RecurringOrderId",
                table: "Orders");

            migrationBuilder.DropForeignKey(
                name: "FK_ProductPricingTiers_ProductVariants_ProductVariantId",
                table: "ProductPricingTiers");

            migrationBuilder.DropTable(
                name: "CustomisationPricingTiers");

            migrationBuilder.DropTable(
                name: "Invoices");

            migrationBuilder.DropTable(
                name: "ProductCollections");

            migrationBuilder.DropTable(
                name: "ProductImages");

            migrationBuilder.DropTable(
                name: "RecurringOrderItems");

            migrationBuilder.DropTable(
                name: "ShippingSettings");

            migrationBuilder.DropTable(
                name: "Collections");

            migrationBuilder.DropTable(
                name: "ProductVariants");

            migrationBuilder.DropTable(
                name: "RecurringOrders");

            migrationBuilder.DropTable(
                name: "Clients");

            migrationBuilder.DropIndex(
                name: "IX_Orders_RecurringOrderId",
                table: "Orders");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_CustomisationOptionId",
                table: "OrderItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_CustomisationPricingTierId",
                table: "OrderItems");

            migrationBuilder.DropIndex(
                name: "IX_OrderItems_PricingTierId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "SuppliesBottles",
                table: "Suppliers");

            migrationBuilder.DropColumn(
                name: "CustomerEmail",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "CustomerName",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "DestinationAddress",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "HeightCm",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "LengthCm",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "WeightKg",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "WidthCm",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "CostCNY",
                table: "ProductPricingTiers");

            migrationBuilder.DropColumn(
                name: "CostPerUnitZAR",
                table: "ProductPricingTiers");

            migrationBuilder.DropColumn(
                name: "CostWithDutiesCNY",
                table: "ProductPricingTiers");

            migrationBuilder.DropColumn(
                name: "SKU",
                table: "ProductPricingTiers");

            migrationBuilder.DropColumn(
                name: "DeliveredDate",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "IsPaid",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PaidAt",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RecurringOrderId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RequiredByDate",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShippingCostZAR",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "SubtotalZAR",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "CustomisationCostZAR",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "CustomisationOptionId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "CustomisationPricingTierId",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "PricingTierId",
                table: "OrderItems");

            migrationBuilder.RenameColumn(
                name: "SuppliesCustomisation",
                table: "Suppliers",
                newName: "OffersCustomisation");

            migrationBuilder.RenameColumn(
                name: "Address",
                table: "Suppliers",
                newName: "Website");

            migrationBuilder.RenameColumn(
                name: "SeaFreightCostZAR",
                table: "Shipments",
                newName: "FreightCostZAR");

            migrationBuilder.RenameColumn(
                name: "UsageSuitability",
                table: "Products",
                newName: "SupplierLink");

            migrationBuilder.RenameColumn(
                name: "UpdatedAt",
                table: "Products",
                newName: "DateAdded");

            migrationBuilder.RenameColumn(
                name: "Slug",
                table: "Products",
                newName: "Texture");

            migrationBuilder.RenameColumn(
                name: "MetaTitle",
                table: "Products",
                newName: "SKUBase");

            migrationBuilder.RenameColumn(
                name: "MetaKeywords",
                table: "Products",
                newName: "LidColour");

            migrationBuilder.RenameColumn(
                name: "MetaDescription",
                table: "Products",
                newName: "BottleColour");

            migrationBuilder.RenameColumn(
                name: "Link1688",
                table: "Products",
                newName: "ShopifyTitle");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "Products",
                newName: "ShopifyBodyHtml");

            migrationBuilder.RenameColumn(
                name: "ProductVariantId",
                table: "ProductPricingTiers",
                newName: "ProductId");

            migrationBuilder.RenameColumn(
                name: "CostWithShippingCNY",
                table: "ProductPricingTiers",
                newName: "DeliveryCostZAR");

            migrationBuilder.RenameIndex(
                name: "IX_ProductPricingTiers_ProductVariantId",
                table: "ProductPricingTiers",
                newName: "IX_ProductPricingTiers_ProductId");

            migrationBuilder.RenameColumn(
                name: "TotalZAR",
                table: "Orders",
                newName: "TotalAmountZAR");

            migrationBuilder.RenameColumn(
                name: "ShippedDate",
                table: "Orders",
                newName: "EstimatedDeliveryDate");

            migrationBuilder.RenameColumn(
                name: "PaystackPaymentReference",
                table: "Orders",
                newName: "BrandingType");

            migrationBuilder.RenameColumn(
                name: "ClientId",
                table: "Orders",
                newName: "CustomerId");

            migrationBuilder.RenameIndex(
                name: "IX_Orders_ClientId",
                table: "Orders",
                newName: "IX_Orders_CustomerId");

            migrationBuilder.RenameColumn(
                name: "ShippingCostZAR",
                table: "OrderItems",
                newName: "TotalPriceZAR");

            migrationBuilder.RenameColumn(
                name: "ProductVariantId",
                table: "OrderItems",
                newName: "ProductId");

            migrationBuilder.RenameColumn(
                name: "LineTotal",
                table: "OrderItems",
                newName: "BrandingCostZAR");

            migrationBuilder.RenameIndex(
                name: "IX_OrderItems_ProductVariantId",
                table: "OrderItems",
                newName: "IX_OrderItems_ProductId");

            migrationBuilder.RenameColumn(
                name: "MinimumQuantity",
                table: "CustomisationOptions",
                newName: "MinQuantity");

            migrationBuilder.RenameColumn(
                name: "Link1688",
                table: "CustomisationOptions",
                newName: "Notes");

            migrationBuilder.AddColumn<int>(
                name: "LeadTimeDays",
                table: "Suppliers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MinOrderQuantity",
                table: "Suppliers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Suppliers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OriginCountry",
                table: "Shipments",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "CostCNY",
                table: "Products",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CostPerUnitZAR",
                table: "Products",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CostWithShippingCNY",
                table: "Products",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Products",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "SizeML",
                table: "Products",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Orders",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "SKU",
                table: "OrderItems",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<int>(
                name: "Type",
                table: "CustomisationOptions",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<decimal>(
                name: "TotalPriceZAR",
                table: "CustomisationOptions",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "InventoryItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    AvailableStock = table.Column<int>(type: "integer", nullable: false),
                    CommittedStock = table.Column<int>(type: "integer", nullable: false),
                    IncomingStock = table.Column<int>(type: "integer", nullable: false),
                    IsStocked = table.Column<bool>(type: "boolean", nullable: false),
                    Location = table.Column<string>(type: "text", nullable: false),
                    OnHandStock = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    SKU = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PricingTiers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductId = table.Column<int>(type: "integer", nullable: false),
                    CompareAtPrice = table.Column<decimal>(type: "numeric", nullable: false),
                    DeliveryCostZAR = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    LogoHotStamping = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    LogoSilkScreen = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    MarginPercent = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    MarkupPercent = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    ProfitPerUnit = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    SKU = table.Column<string>(type: "text", nullable: false),
                    SalePricePerUnit = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalCostPrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalProfit = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    TotalSalePrice = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PricingTiers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PricingTiers_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "ConcurrencyStamp", "PasswordHash" },
                values: new object[] { "6e43a167-f2a2-44ee-8ba9-67edaca52edf", "AQAAAAIAAYagAAAAEFlqE95Y3YChoc/nL5MtgnhAlMQ4VlVkUyJSq/+2v4Ji7lR+2yjBIvj2fzd0xmLVDA==" });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_ProductId",
                table: "InventoryItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_PricingTiers_ProductId",
                table: "PricingTiers",
                column: "ProductId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_Products_ProductId",
                table: "OrderItems",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Orders_Customers_CustomerId",
                table: "Orders",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProductPricingTiers_Products_ProductId",
                table: "ProductPricingTiers",
                column: "ProductId",
                principalTable: "Products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
