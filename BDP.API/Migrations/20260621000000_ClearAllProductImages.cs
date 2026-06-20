using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BDP.API.Migrations
{
    public partial class ClearAllProductImages : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DELETE FROM ""ProductImages"";");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
