using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BDP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "Suppliers",
                type: "text",
                nullable: true);

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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Website", table: "Suppliers");
            migrationBuilder.DropColumn(name: "LeadTimeDays", table: "Suppliers");
            migrationBuilder.DropColumn(name: "MinOrderQuantity", table: "Suppliers");
            migrationBuilder.DropColumn(name: "Notes", table: "Suppliers");
        }
    }
}
