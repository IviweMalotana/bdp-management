using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BDP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddYunOrderId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "YunOrderId",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "ConcurrencyStamp", "PasswordHash" },
                values: new object[] { "53037cb6-eeb0-4ba3-85d3-8a6e41d2c226", "AQAAAAIAAYagAAAAEMqVQ4L9CIguItzZy1Z2wpS5ZuZW66E9nz7rQcRpOzKuQqzlD9BR6y7sWMjzfWDixw==" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "YunOrderId",
                table: "Orders");

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "ConcurrencyStamp", "PasswordHash" },
                values: new object[] { "a5351fe6-08bd-46c2-b277-a26608d2255d", "AQAAAAIAAYagAAAAEFgJRhdPxFWPfc5XZCnHgvF3aFwejd+cChcosVhF8aHZyE2dgIaE7npXz0+agXU+3A==" });
        }
    }
}
