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
            // ── Product: add shipping dimension columns (IF NOT EXISTS — may already exist from B2B migration) ──
            migrationBuilder.Sql("ALTER TABLE \"Products\" ADD COLUMN IF NOT EXISTS \"WeightKg\" numeric(10,4) NOT NULL DEFAULT 0.10;");
            migrationBuilder.Sql("ALTER TABLE \"Products\" ADD COLUMN IF NOT EXISTS \"LengthCm\" numeric(10,2) NOT NULL DEFAULT 4;");
            migrationBuilder.Sql("ALTER TABLE \"Products\" ADD COLUMN IF NOT EXISTS \"WidthCm\" numeric(10,2) NOT NULL DEFAULT 4;");
            migrationBuilder.Sql("ALTER TABLE \"Products\" ADD COLUMN IF NOT EXISTS \"HeightCm\" numeric(10,2) NOT NULL DEFAULT 12;");
            migrationBuilder.Sql("ALTER TABLE \"Products\" ADD COLUMN IF NOT EXISTS \"VolumeCBM\" numeric(18,9) NOT NULL DEFAULT 0.000192;");

            // Dimension population skipped — SizeML column removed by B2B migration; seeder handles this.

            // Rename FreightCostZAR → SeaFreightCostZAR if it still exists (may have been renamed already)
            migrationBuilder.Sql(@"
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Shipments' AND column_name='FreightCostZAR') THEN
                        ALTER TABLE ""Shipments"" RENAME COLUMN ""FreightCostZAR"" TO ""SeaFreightCostZAR"";
                    END IF;
                END $$;
            ");
            // Drop OriginCountry if it still exists
            migrationBuilder.Sql(@"ALTER TABLE ""Shipments"" DROP COLUMN IF EXISTS ""OriginCountry"";");

            // These columns may already exist from AddB2BCollectionsVariantsSEO
            migrationBuilder.Sql("ALTER TABLE \"Shipments\" ADD COLUMN IF NOT EXISTS \"DestinationAddress\" text;");
            migrationBuilder.Sql("ALTER TABLE \"Shipments\" ADD COLUMN IF NOT EXISTS \"CustomerName\" text;");
            migrationBuilder.Sql("ALTER TABLE \"Shipments\" ADD COLUMN IF NOT EXISTS \"CustomerEmail\" text;");

            // ShippingSettings may already exist
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""ShippingSettings"" (
                    ""Id"" integer NOT NULL DEFAULT 1,
                    ""CnyPerCbm"" numeric(18,4) NOT NULL DEFAULT 2000,
                    ""CnyPerKg"" numeric(18,4) NOT NULL DEFAULT 10,
                    ""CnyToZarRate"" numeric(18,4) NOT NULL DEFAULT 2.40,
                    ""UpdatedAt"" timestamp with time zone NOT NULL DEFAULT NOW(),
                    CONSTRAINT ""PK_ShippingSettings"" PRIMARY KEY (""Id"")
                );
                INSERT INTO ""ShippingSettings"" (""Id"", ""CnyPerCbm"", ""CnyPerKg"", ""CnyToZarRate"", ""UpdatedAt"")
                VALUES (1, 2000, 10, 2.40, NOW())
                ON CONFLICT (""Id"") DO NOTHING;
            ");
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
