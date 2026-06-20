using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BDP.API.Migrations
{
    public partial class RemoveSeedProductsAndImages : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Delete old seeded placeholder products (ids 1-10) — these have
            // Unsplash images and dummy data, replaced by real imported products.
            migrationBuilder.Sql(@"
                DELETE FROM ""CartItems"" WHERE ""ProductVariantId"" IN (
                    SELECT ""Id"" FROM ""ProductVariants"" WHERE ""ProductId"" <= 10
                );
                DELETE FROM ""OrderItems"" WHERE ""ProductVariantId"" IN (
                    SELECT ""Id"" FROM ""ProductVariants"" WHERE ""ProductId"" <= 10
                );
                DELETE FROM ""ProductCollections"" WHERE ""ProductId"" <= 10;
                DELETE FROM ""ProductImages"" WHERE ""ProductId"" <= 10;
                DELETE FROM ""ProductVariants"" WHERE ""ProductId"" <= 10;
                DELETE FROM ""Products"" WHERE ""Id"" <= 10;
            ");

            // Clear all remaining ProductImages — will be repopulated via Sync Images
            migrationBuilder.Sql(@"DELETE FROM ""ProductImages"";");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
