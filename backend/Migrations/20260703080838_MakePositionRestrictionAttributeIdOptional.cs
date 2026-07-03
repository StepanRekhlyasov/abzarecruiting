using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class MakePositionRestrictionAttributeIdOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PositionRestrictions_Attributes_AttributeId",
                table: "PositionRestrictions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PositionRestrictions",
                table: "PositionRestrictions");

            migrationBuilder.AlterColumn<int>(
                name: "AttributeId",
                table: "PositionRestrictions",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "PositionRestrictions",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("MySQL:ValueGenerationStrategy", MySQLValueGenerationStrategy.IdentityColumn);

            migrationBuilder.AddPrimaryKey(
                name: "PK_PositionRestrictions",
                table: "PositionRestrictions",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_PositionRestrictions_PositionId",
                table: "PositionRestrictions",
                column: "PositionId");

            migrationBuilder.AddForeignKey(
                name: "FK_PositionRestrictions_Attributes_AttributeId",
                table: "PositionRestrictions",
                column: "AttributeId",
                principalTable: "Attributes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PositionRestrictions_Attributes_AttributeId",
                table: "PositionRestrictions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PositionRestrictions",
                table: "PositionRestrictions");

            migrationBuilder.DropIndex(
                name: "IX_PositionRestrictions_PositionId",
                table: "PositionRestrictions");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "PositionRestrictions");

            migrationBuilder.AlterColumn<int>(
                name: "AttributeId",
                table: "PositionRestrictions",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_PositionRestrictions",
                table: "PositionRestrictions",
                columns: new[] { "PositionId", "AttributeId" });

            migrationBuilder.AddForeignKey(
                name: "FK_PositionRestrictions_Attributes_AttributeId",
                table: "PositionRestrictions",
                column: "AttributeId",
                principalTable: "Attributes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
