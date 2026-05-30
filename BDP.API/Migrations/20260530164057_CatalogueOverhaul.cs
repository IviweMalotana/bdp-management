using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BDP.API.Migrations
{
    /// <inheritdoc />
    public partial class CatalogueOverhaul : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "BufferCNY",
                table: "ShippingSettings",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ProfitCNY",
                table: "ShippingSettings",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<string>(
                name: "Texture",
                table: "ProductVariants",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Size",
                table: "ProductVariants",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "LidColour",
                table: "ProductVariants",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "BottleColour",
                table: "ProductVariants",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "AccessoriesIncluded",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaseBodyColor",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaseBodyFinish",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BodyMaterial",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClosureType",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ColorVariantName",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageDriveLink",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageFilename",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LidCapColor",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LidCapFinish",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LidCapMaterial",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SkuId",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source1688Url",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SpecificationSize",
                table: "ProductVariants",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SupplierMoq",
                table: "ProductVariants",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPriceCNY",
                table: "ProductVariants",
                type: "numeric(18,4)",
                precision: 18,
                scale: 4,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ProductType",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShapeStyle",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupplierItemNumber",
                table: "Products",
                type: "text",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "ConcurrencyStamp", "PasswordHash" },
                values: new object[] { "4211b88f-79e7-40be-aebc-1b75ed990e78", "AQAAAAIAAYagAAAAEHA/tJDGUnVd7tQPmqz0ZaSH9xOUbfj3W1X6Rjwm/eQVhv/B+WjLUko3MZBAizYxQw==" });

            migrationBuilder.UpdateData(
                table: "ShippingSettings",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "BufferCNY", "ProfitCNY" },
                values: new object[] { 3.00m, 1.00m });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BufferCNY",
                table: "ShippingSettings");

            migrationBuilder.DropColumn(
                name: "ProfitCNY",
                table: "ShippingSettings");

            migrationBuilder.DropColumn(
                name: "AccessoriesIncluded",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "BaseBodyColor",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "BaseBodyFinish",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "BodyMaterial",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "ClosureType",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "ColorVariantName",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "ImageDriveLink",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "ImageFilename",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "LidCapColor",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "LidCapFinish",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "LidCapMaterial",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "SkuId",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "Source1688Url",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "SpecificationSize",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "SupplierMoq",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "UnitPriceCNY",
                table: "ProductVariants");

            migrationBuilder.DropColumn(
                name: "ProductType",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "ShapeStyle",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SupplierItemNumber",
                table: "Products");

            migrationBuilder.AlterColumn<string>(
                name: "Texture",
                table: "ProductVariants",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Size",
                table: "ProductVariants",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LidColour",
                table: "ProductVariants",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "BottleColour",
                table: "ProductVariants",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.UpdateData(
                table: "AspNetUsers",
                keyColumn: "Id",
                keyValue: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                columns: new[] { "ConcurrencyStamp", "PasswordHash" },
                values: new object[] { "53037cb6-eeb0-4ba3-85d3-8a6e41d2c226", "AQAAAAIAAYagAAAAEMqVQ4L9CIguItzZy1Z2wpS5ZuZW66E9nz7rQcRpOzKuQqzlD9BR6y7sWMjzfWDixw==" });
        }
    }
}
