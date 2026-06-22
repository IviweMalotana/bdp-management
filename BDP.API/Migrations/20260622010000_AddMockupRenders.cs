using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace BDP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMockupRenders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "RenderCreditZAR",
                table: "Orders",
                type: "numeric(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "MockupRenders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Email = table.Column<string>(type: "text", nullable: false),
                    ProductVariantId = table.Column<int>(type: "integer", nullable: true),
                    SourceUrl = table.Column<string>(type: "text", nullable: true),
                    ResultUrl = table.Column<string>(type: "text", nullable: true),
                    FeeZAR = table.Column<decimal>(type: "numeric", nullable: false),
                    PaystackReference = table.Column<string>(type: "text", nullable: true),
                    IsPaid = table.Column<bool>(type: "boolean", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreditStatus = table.Column<string>(type: "text", nullable: false),
                    RedeemedOrderId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MockupRenders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MockupRenders_ProductVariants_ProductVariantId",
                        column: x => x.ProductVariantId,
                        principalTable: "ProductVariants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MockupRenders_Email",
                table: "MockupRenders",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_MockupRenders_PaystackReference",
                table: "MockupRenders",
                column: "PaystackReference");

            migrationBuilder.CreateIndex(
                name: "IX_MockupRenders_ProductVariantId",
                table: "MockupRenders",
                column: "ProductVariantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "MockupRenders");
            migrationBuilder.DropColumn(name: "RenderCreditZAR", table: "Orders");
        }
    }
}
