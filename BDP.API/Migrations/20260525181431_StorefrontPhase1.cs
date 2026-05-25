using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BDP.API.Migrations
{
    /// <inheritdoc />
    public partial class StorefrontPhase1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "ClientId",
                table: "Orders",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "BillingAddressJson",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Channel",
                table: "Orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FulfilmentStatus",
                table: "Orders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "GuestEmail",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethod",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShippingAddressJson",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserId",
                table: "Orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AccountType",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "B2BClientId",
                table: "AspNetUsers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "B2BStatus",
                table: "AspNetUsers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Carts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: true),
                    SessionToken = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Carts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CustomerAddresses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Label = table.Column<string>(type: "text", nullable: false),
                    RecipientName = table.Column<string>(type: "text", nullable: false),
                    Line1 = table.Column<string>(type: "text", nullable: false),
                    Line2 = table.Column<string>(type: "text", nullable: true),
                    City = table.Column<string>(type: "text", nullable: false),
                    Province = table.Column<string>(type: "text", nullable: false),
                    PostalCode = table.Column<string>(type: "text", nullable: false),
                    Country = table.Column<string>(type: "text", nullable: false),
                    Phone = table.Column<string>(type: "text", nullable: true),
                    IsDefaultShipping = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefaultBilling = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerAddresses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CartItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CartId = table.Column<int>(type: "integer", nullable: false),
                    ProductVariantId = table.Column<int>(type: "integer", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    CustomisationOptionId = table.Column<int>(type: "integer", nullable: true),
                    CustomisationNotes = table.Column<string>(type: "text", nullable: true),
                    AddedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CartItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CartItems_Carts_CartId",
                        column: x => x.CartId,
                        principalTable: "Carts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CartItems_CustomisationOptions_CustomisationOptionId",
                        column: x => x.CustomisationOptionId,
                        principalTable: "CustomisationOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CartItems_ProductVariants_ProductVariantId",
                        column: x => x.ProductVariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "AccountType", "B2BClientId", "B2BStatus", "ConcurrencyStamp", "PasswordHash", "Phone" },
                values: new object[] { "B2C", null, "NA", "617da4ef-2102-46b9-848c-3c7b522db184", "AQAAAAIAAYagAAAAENG6l12OrDh+KBAR6ivL2VXqtUqMGaLbGGaeKjwdOb7aRS5jIJ0Cc74cgkx36DNaCw==", null });

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_CartId",
                table: "CartItems",
                column: "CartId");

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_CustomisationOptionId",
                table: "CartItems",
                column: "CustomisationOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_ProductVariantId",
                table: "CartItems",
                column: "ProductVariantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CartItems");

            migrationBuilder.DropTable(
                name: "CustomerAddresses");

            migrationBuilder.DropTable(
                name: "Carts");

            migrationBuilder.DropColumn(
                name: "BillingAddressJson",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "Channel",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "FulfilmentStatus",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "GuestEmail",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "ShippingAddressJson",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "AccountType",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "B2BClientId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "B2BStatus",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "AspNetUsers");

            migrationBuilder.AlterColumn<int>(
                name: "ClientId",
                table: "Orders",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "ConcurrencyStamp", "PasswordHash" },
                values: new object[] { "7c9d6d41-e3f3-4254-8930-96c0c31b11b1", "AQAAAAIAAYagAAAAEOADiu8n+kzYKXd4p5WUsmJKnTHBe+YyZwfLf5o9rVMmnvLNtM0GtrWuJ4g1atCMQg==" });
        }
    }
}
