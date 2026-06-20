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
            migrationBuilder.Sql(@"
                DELETE FROM ""ProductImages""
                WHERE ""ProductId"" IN (
                    SELECT DISTINCT p.""Id"" FROM ""Products"" p
                    LEFT JOIN ""ProductVariants"" pv ON pv.""ProductId"" = p.""Id""
                    WHERE pv.""SkuId"" IN (
                        'VL942839135338-5ML-0',
                        'SQ821-120ml-CLR-PMP',
                        'VL900977565577-5ML-SLV',
                        'VL970296694242-20ML-0',
                        'VL992462959261-30ML-AMB',
                        'VL830964852715-20ML-0',
                        'TSFC708-30g-CLR-BLK',
                        'VL874674319769-10ML-0',
                        'VL1027823671393-15ML-0',
                        'VL917018224004-20ML-0',
                        'VL735633662547-5ML-AMB',
                        'WDR990-20ml-CLR-WD',
                        'VL718490606529-10ML-CLR-BW'
                    )
                    OR p.""Slug"" IN (
                        'aurora-pump',
                        'daphne-jar',
                        'darla-pump',
                        'delphi-pump',
                        'devin-serum'
                    )
                );
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Images are not restored on rollback — re-run Sync Images to repopulate.
        }
    }
}
