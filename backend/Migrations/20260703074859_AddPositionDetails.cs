using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPositionDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Company",
                table: "Positions",
                type: "varchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "Positions",
                type: "varchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Format",
                table: "Positions",
                type: "varchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Office");

            migrationBuilder.AddColumn<string>(
                name: "Level",
                table: "Positions",
                type: "varchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Junior");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Company",
                table: "Positions");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "Positions");

            migrationBuilder.DropColumn(
                name: "Format",
                table: "Positions");

            migrationBuilder.DropColumn(
                name: "Level",
                table: "Positions");
        }
    }
}
