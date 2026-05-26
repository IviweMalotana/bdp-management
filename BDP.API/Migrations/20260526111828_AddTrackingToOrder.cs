using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BDP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTrackingToOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TrackingCarrier",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrackingNumber",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "ConcurrencyStamp", "PasswordHash" },
                values: new object[] { "a5351fe6-08bd-46c2-b277-a26608d2255d", "AQAAAAIAAYagAAAAEFgJRhdPxFWPfc5XZCnHgvF3aFwejd+cChcosVhF8aHZyE2dgIaE7npXz0+agXU+3A==" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TrackingCarrier",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "TrackingNumber",
                table: "Orders");

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "ConcurrencyStamp", "PasswordHash" },
                values: new object[] { "cff6235c-493d-4179-a661-b493a9968822", "AQAAAAIAAYagAAAAEIEJwFUEJpGTU2Bz2ogbsHhJgc/xEJbU4eHZTWWIO8lNUtkMF5rOc7Cnr1OZJcLhTA==" });
        }
    }
}
