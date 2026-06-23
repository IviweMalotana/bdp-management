using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BDP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddActualShippingCostZAR : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "ActualShippingCostZAR",
                table: "Orders",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ActualShippingCostZAR", table: "Orders");
        }
    }
}
