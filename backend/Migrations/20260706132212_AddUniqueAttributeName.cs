using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueAttributeName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE pa_duplicate
                FROM ProfileAttributes pa_duplicate
                INNER JOIN Attributes a_duplicate ON pa_duplicate.AttributeId = a_duplicate.Id
                INNER JOIN (
                    SELECT Name, MIN(Id) AS KeeperId
                    FROM Attributes
                    GROUP BY Name
                ) keepers ON a_duplicate.Name = keepers.Name
                INNER JOIN ProfileAttributes pa_keeper
                    ON pa_keeper.CandidateId = pa_duplicate.CandidateId
                    AND pa_keeper.AttributeId = keepers.KeeperId
                WHERE pa_duplicate.AttributeId <> keepers.KeeperId;

                UPDATE ProfileAttributes pa
                INNER JOIN Attributes a ON pa.AttributeId = a.Id
                INNER JOIN (
                    SELECT Name, MIN(Id) AS KeeperId
                    FROM Attributes
                    GROUP BY Name
                ) keepers ON a.Name = keepers.Name
                SET pa.AttributeId = keepers.KeeperId
                WHERE pa.AttributeId <> keepers.KeeperId;

                DELETE pa_duplicate
                FROM PositionAttributes pa_duplicate
                INNER JOIN Attributes a_duplicate ON pa_duplicate.AttributeId = a_duplicate.Id
                INNER JOIN (
                    SELECT Name, MIN(Id) AS KeeperId
                    FROM Attributes
                    GROUP BY Name
                ) keepers ON a_duplicate.Name = keepers.Name
                INNER JOIN PositionAttributes pa_keeper
                    ON pa_keeper.PositionId = pa_duplicate.PositionId
                    AND pa_keeper.AttributeId = keepers.KeeperId
                WHERE pa_duplicate.AttributeId <> keepers.KeeperId;

                UPDATE PositionAttributes pa
                INNER JOIN Attributes a ON pa.AttributeId = a.Id
                INNER JOIN (
                    SELECT Name, MIN(Id) AS KeeperId
                    FROM Attributes
                    GROUP BY Name
                ) keepers ON a.Name = keepers.Name
                SET pa.AttributeId = keepers.KeeperId
                WHERE pa.AttributeId <> keepers.KeeperId;

                UPDATE PositionRestrictions pr
                INNER JOIN Attributes a ON pr.AttributeId = a.Id
                INNER JOIN (
                    SELECT Name, MIN(Id) AS KeeperId
                    FROM Attributes
                    GROUP BY Name
                ) keepers ON a.Name = keepers.Name
                SET pr.AttributeId = keepers.KeeperId
                WHERE pr.AttributeId IS NOT NULL
                    AND pr.AttributeId <> keepers.KeeperId;

                DELETE a
                FROM Attributes a
                INNER JOIN (
                    SELECT Name, MIN(Id) AS KeeperId
                    FROM Attributes
                    GROUP BY Name
                ) keepers ON a.Name = keepers.Name
                WHERE a.Id <> keepers.KeeperId;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Attributes_Name",
                table: "Attributes",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Attributes_Name",
                table: "Attributes");
        }
    }
}
