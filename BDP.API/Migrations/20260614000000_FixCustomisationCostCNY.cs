using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BDP.API.Migrations
{
    /// <summary>
    /// Idempotent fix: ensures CostPerUnitCNY exists on CustomisationSettings.
    /// The previous migration (20260613000000) was recorded in __EFMigrationsHistory
    /// but the DDL may not have executed on the production database.
    /// Using IF NOT EXISTS so this is safe whether or not the column already exists.
    /// </summary>
    public partial class FixCustomisationCostCNY : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""CustomisationSettings""
                ADD COLUMN IF NOT EXISTS ""CostPerUnitCNY"" numeric NOT NULL DEFAULT 0;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE ""CustomisationSettings""
                DROP COLUMN IF EXISTS ""CostPerUnitCNY"";
            ");
        }
    }
}
