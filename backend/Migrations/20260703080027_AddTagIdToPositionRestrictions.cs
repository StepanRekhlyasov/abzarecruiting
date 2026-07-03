using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTagIdToPositionRestrictions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TagId",
                table: "PositionRestrictions",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PositionRestrictions_TagId",
                table: "PositionRestrictions",
                column: "TagId");

            migrationBuilder.AddForeignKey(
                name: "FK_PositionRestrictions_Tags_TagId",
                table: "PositionRestrictions",
                column: "TagId",
                principalTable: "Tags",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PositionRestrictions_Tags_TagId",
                table: "PositionRestrictions");

            migrationBuilder.DropIndex(
                name: "IX_PositionRestrictions_TagId",
                table: "PositionRestrictions");

            migrationBuilder.DropColumn(
                name: "TagId",
                table: "PositionRestrictions");
        }
    }
}
