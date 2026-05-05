using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BDP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddShippingRates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShippingRates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Country = table.Column<string>(type: "text", nullable: false),
                    ShippingType = table.Column<string>(type: "text", nullable: false),
                    RatePerKg = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    RatePerCbm = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    FuelSurchargePercent = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    DutyRatePercent = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    VatRatePercent = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    HandlingFeeZAR = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    MinimumChargeZAR = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ExchangeRateCNYToZAR = table.Column<decimal>(type: "numeric(10,4)", precision: 10, scale: 4, nullable: false),
                    EstimatedTransitDays = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShippingRates", x => x.Id);
                });

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "ConcurrencyStamp", "PasswordHash" },
                values: new object[] { "b20137e9-a125-487f-96ab-65a67021004d", "AQAAAAIAAYagAAAAEIgUlpyiBQpzRcyIckpVFnJDJz6iY5dvwTWeiEQm8i1J0rg5t/K7VntxZK0PHNqPTQ==" });

            migrationBuilder.CreateIndex(
                name: "IX_ShippingRates_Country_ShippingType",
                table: "ShippingRates",
                columns: new[] { "Country", "ShippingType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ShippingRates");

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "ConcurrencyStamp", "PasswordHash" },
                values: new object[] { "4effb38b-6210-4f45-a6ed-87d71de87504", "AQAAAAIAAYagAAAAEKSr8XujulKhAM/sZmb2wNXXrKKjSGT6tFkP4+XO0ZAAJWrZyIkO6QTZ9f9LpHINIA==" });
        }
    }
}
