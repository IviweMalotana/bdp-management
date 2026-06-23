using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BDP.API.Migrations
{
    public partial class AddShippingMarkupPercent : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ShippingMarkupPercent",
                table: "ShippingSettings",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 40m);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ShippingMarkupPercent", table: "ShippingSettings");
        }
    }
}
