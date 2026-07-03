using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCustomUserRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var role in new[] { "Candidate", "Recruiter", "Admin" })
            {
                migrationBuilder.Sql($"""
                    INSERT INTO AspNetRoles (Id, Name, NormalizedName, ConcurrencyStamp)
                    SELECT UUID(), '{role}', '{role.ToUpperInvariant()}', UUID()
                    FROM DUAL
                    WHERE NOT EXISTS (
                        SELECT 1 FROM AspNetRoles WHERE NormalizedName = '{role.ToUpperInvariant()}'
                    );
                    """);
            }

            migrationBuilder.Sql("""
                INSERT INTO AspNetUserRoles (UserId, RoleId)
                SELECT u.Id, r.Id
                FROM AspNetUsers u
                INNER JOIN AspNetRoles r ON r.Name = u.Role
                WHERE NOT EXISTS (
                    SELECT 1 FROM AspNetUserRoles ur
                    WHERE ur.UserId = u.Id AND ur.RoleId = r.Id
                );
                """);

            migrationBuilder.DropColumn(
                name: "Role",
                table: "AspNetUsers");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "AspNetUsers",
                type: "varchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Candidate");

            migrationBuilder.Sql("""
                UPDATE AspNetUsers u
                INNER JOIN (
                    SELECT ur.UserId, r.Name
                    FROM AspNetUserRoles ur
                    INNER JOIN AspNetRoles r ON r.Id = ur.RoleId
                ) roles ON roles.UserId = u.Id
                SET u.Role = roles.Name;
                """);
        }
    }
}
