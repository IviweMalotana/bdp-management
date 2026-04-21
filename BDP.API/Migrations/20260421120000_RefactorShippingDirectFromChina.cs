using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BDP.API.Migrations
{
    /// <inheritdoc />
    public partial class RefactorShippingDirectFromChina : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── Product: add shipping dimension columns ──────────────────────
            migrationBuilder.AddColumn<decimal>(
                name: "WeightKg",
                table: "Products",
                type: "numeric(10,4)",
                precision: 10,
                scale: 4,
                nullable: false,
                defaultValue: 0.10m);

            migrationBuilder.AddColumn<decimal>(
                name: "LengthCm",
                table: "Products",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 4m);

            migrationBuilder.AddColumn<decimal>(
                name: "WidthCm",
                table: "Products",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 4m);

            migrationBuilder.AddColumn<decimal>(
                name: "HeightCm",
                table: "Products",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 12m);

            migrationBuilder.AddColumn<decimal>(
                name: "VolumeCBM",
                table: "Products",
                type: "numeric(18,9)",
                precision: 18,
                scale: 9,
                nullable: false,
                defaultValue: 0.000192m);

            // ── Populate dimensions by category ──────────────────────────────
            // Serum 30ml
            migrationBuilder.Sql(@"
                UPDATE ""Products""
                SET ""WeightKg"" = 0.10, ""LengthCm"" = 4, ""WidthCm"" = 4, ""HeightCm"" = 12,
                    ""VolumeCBM"" = 0.000000192
                WHERE LOWER(""Category"") = 'serum' AND ""SizeML"" <= 30");

            // Serum > 30ml (e.g. 40ml Dakota)
            migrationBuilder.Sql(@"
                UPDATE ""Products""
                SET ""WeightKg"" = 0.12, ""LengthCm"" = 4, ""WidthCm"" = 4, ""HeightCm"" = 14,
                    ""VolumeCBM"" = 0.000000224
                WHERE LOWER(""Category"") = 'serum' AND ""SizeML"" > 30");

            // Pump / Spray 30ml
            migrationBuilder.Sql(@"
                UPDATE ""Products""
                SET ""WeightKg"" = 0.10, ""LengthCm"" = 4, ""WidthCm"" = 4, ""HeightCm"" = 14,
                    ""VolumeCBM"" = 0.000000224
                WHERE LOWER(""Category"") IN ('pump', 'spray') AND ""SizeML"" <= 30");

            // Jar <= 30
            migrationBuilder.Sql(@"
                UPDATE ""Products""
                SET ""WeightKg"" = 0.12, ""LengthCm"" = 6, ""WidthCm"" = 6, ""HeightCm"" = 5,
                    ""VolumeCBM"" = 0.000000180
                WHERE LOWER(""Category"") = 'jar' AND ""SizeML"" <= 30");

            // Jar > 30
            migrationBuilder.Sql(@"
                UPDATE ""Products""
                SET ""WeightKg"" = 0.15, ""LengthCm"" = 7, ""WidthCm"" = 7, ""HeightCm"" = 6,
                    ""VolumeCBM"" = 0.000000294
                WHERE LOWER(""Category"") = 'jar' AND ""SizeML"" > 30");

            // ── Shipment: rename FreightCostZAR, remove OriginCountry, add new cols ──
            migrationBuilder.RenameColumn(
                name: "FreightCostZAR",
                table: "Shipments",
                newName: "SeaFreightCostZAR");

            migrationBuilder.DropColumn(
                name: "OriginCountry",
                table: "Shipments");

            migrationBuilder.AddColumn<string>(
                name: "DestinationAddress",
                table: "Shipments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerName",
                table: "Shipments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerEmail",
                table: "Shipments",
                type: "text",
                nullable: true);

            // ── ShippingSettings singleton table ─────────────────────────────
            migrationBuilder.CreateTable(
                name: "ShippingSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CnyPerCbm = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CnyPerKg = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    CnyToZarRate = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShippingSettings", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "ShippingSettings",
                columns: new[] { "Id", "CnyPerCbm", "CnyPerKg", "CnyToZarRate", "Notes" },
                values: new object[] { 1, 2000m, 10m, 2.40m, "Sea DDP China to customer" });

            // ── Recalculate ProductPricingTiers.DeliveryCostZAR ──────────────
            // Formula: ((VolumeCBM * qty * 2000) + (WeightKg * qty * 10)) * 2.40
            // Using per-unit rates matched to category defaults:
            // Serum 30ml: R3.3216/unit  | Serum >30ml: R3.9552/unit
            // Pump/Spray: R3.4752/unit  | Jar <=30:    R3.744/unit  | Jar >30: R5.0112/unit
            migrationBuilder.Sql(@"
                UPDATE ""ProductPricingTiers"" ppt
                SET ""DeliveryCostZAR"" = ppt.""Quantity"" * CASE
                    WHEN LOWER(p.""Category"") = 'serum' AND p.""SizeML"" <= 30 THEN 3.3216
                    WHEN LOWER(p.""Category"") = 'serum' AND p.""SizeML"" > 30  THEN 3.9552
                    WHEN LOWER(p.""Category"") IN ('pump', 'spray')              THEN 3.4752
                    WHEN LOWER(p.""Category"") = 'jar'   AND p.""SizeML"" <= 30 THEN 3.744
                    WHEN LOWER(p.""Category"") = 'jar'   AND p.""SizeML"" > 30  THEN 5.0112
                    ELSE 3.3216
                END
                FROM ""Products"" p
                WHERE ppt.""ProductId"" = p.""Id""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ShippingSettings");

            migrationBuilder.DropColumn(name: "WeightKg",   table: "Products");
            migrationBuilder.DropColumn(name: "LengthCm",   table: "Products");
            migrationBuilder.DropColumn(name: "WidthCm",    table: "Products");
            migrationBuilder.DropColumn(name: "HeightCm",   table: "Products");
            migrationBuilder.DropColumn(name: "VolumeCBM",  table: "Products");

            migrationBuilder.RenameColumn(
                name: "SeaFreightCostZAR",
                table: "Shipments",
                newName: "FreightCostZAR");

            migrationBuilder.AddColumn<string>(
                name: "OriginCountry",
                table: "Shipments",
                type: "text",
                nullable: false,
                defaultValue: "China");

            migrationBuilder.DropColumn(name: "DestinationAddress", table: "Shipments");
            migrationBuilder.DropColumn(name: "CustomerName",       table: "Shipments");
            migrationBuilder.DropColumn(name: "CustomerEmail",      table: "Shipments");
        }
    }
}
