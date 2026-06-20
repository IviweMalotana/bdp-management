using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BDP.API.Migrations
{
    public partial class RemoveBrandedProductImages : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Remove images for products whose current images contain branding,
            // Chinese watermarks, or third-party logos. These will be replaced
            // when the admin runs Sync Images with clean supplier photos.
            // Clear all product images — they will be repopulated via Sync Images
            // using the clean 'Images' column from the Google Sheet.
            migrationBuilder.Sql(@"DELETE FROM ""ProductImages"";");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Images are not restored on rollback — re-run Sync Images to repopulate.
        }
    }
}
