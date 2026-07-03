using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameProjectsToProfileProjects : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProjectTags_Projects_ProjectId",
                table: "ProjectTags");

            migrationBuilder.DropForeignKey(
                name: "FK_ProjectTags_Tags_TagId",
                table: "ProjectTags");

            migrationBuilder.RenameTable(
                name: "Projects",
                newName: "ProfileProjects");

            migrationBuilder.RenameTable(
                name: "ProjectTags",
                newName: "ProfileProjectTags");

            migrationBuilder.RenameColumn(
                name: "ProjectId",
                table: "ProfileProjectTags",
                newName: "ProfileProjectId");

            migrationBuilder.RenameIndex(
                name: "IX_Projects_CandidateId",
                table: "ProfileProjects",
                newName: "IX_ProfileProjects_CandidateId");

            migrationBuilder.RenameIndex(
                name: "IX_ProjectTags_TagId",
                table: "ProfileProjectTags",
                newName: "IX_ProfileProjectTags_TagId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProfileProjectTags_ProfileProjects_ProfileProjectId",
                table: "ProfileProjectTags",
                column: "ProfileProjectId",
                principalTable: "ProfileProjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ProfileProjectTags_Tags_TagId",
                table: "ProfileProjectTags",
                column: "TagId",
                principalTable: "Tags",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProfileProjectTags_ProfileProjects_ProfileProjectId",
                table: "ProfileProjectTags");

            migrationBuilder.DropForeignKey(
                name: "FK_ProfileProjectTags_Tags_TagId",
                table: "ProfileProjectTags");

            migrationBuilder.RenameTable(
                name: "ProfileProjects",
                newName: "Projects");

            migrationBuilder.RenameTable(
                name: "ProfileProjectTags",
                newName: "ProjectTags");

            migrationBuilder.RenameColumn(
                name: "ProfileProjectId",
                table: "ProjectTags",
                newName: "ProjectId");

            migrationBuilder.RenameIndex(
                name: "IX_ProfileProjects_CandidateId",
                table: "Projects",
                newName: "IX_Projects_CandidateId");

            migrationBuilder.RenameIndex(
                name: "IX_ProfileProjectTags_TagId",
                table: "ProjectTags",
                newName: "IX_ProjectTags_TagId");

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectTags_Projects_ProjectId",
                table: "ProjectTags",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectTags_Tags_TagId",
                table: "ProjectTags",
                column: "TagId",
                principalTable: "Tags",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
