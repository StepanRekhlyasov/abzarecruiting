using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameDefaultAttributeNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE legacy
                FROM Attributes legacy
                INNER JOIN Attributes current ON current.Name = 'First name'
                WHERE legacy.Name = 'firstName'
                    AND legacy.Id <> current.Id;

                UPDATE Attributes
                SET Name = 'First name'
                WHERE Name = 'firstName';

                DELETE legacy
                FROM Attributes legacy
                INNER JOIN Attributes current ON current.Name = 'Last name'
                WHERE legacy.Name = 'lastName'
                    AND legacy.Id <> current.Id;

                UPDATE Attributes
                SET Name = 'Last name'
                WHERE Name = 'lastName';

                DELETE legacy
                FROM Attributes legacy
                INNER JOIN Attributes current ON current.Name = 'Phone number'
                WHERE legacy.Name = 'phone'
                    AND legacy.Id <> current.Id;

                UPDATE Attributes
                SET Name = 'Phone number'
                WHERE Name = 'phone';

                DELETE legacy
                FROM Attributes legacy
                INNER JOIN Attributes current ON current.Name = 'Biography'
                WHERE legacy.Name = 'bio'
                    AND legacy.Id <> current.Id;

                UPDATE Attributes
                SET Name = 'Biography'
                WHERE Name = 'bio';

                DELETE legacy
                FROM Attributes legacy
                INNER JOIN Attributes current ON current.Name = 'Location'
                WHERE legacy.Name = 'location'
                    AND legacy.Id <> current.Id;

                UPDATE Attributes
                SET Name = 'Location'
                WHERE Name = 'location';

                DELETE legacy
                FROM Attributes legacy
                INNER JOIN Attributes current ON current.Name = 'Profile photo'
                WHERE legacy.Name = 'photo'
                    AND legacy.Id <> current.Id;

                UPDATE Attributes
                SET Name = 'Profile photo'
                WHERE Name = 'photo';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE Attributes SET Name = 'firstName' WHERE Name = 'First name';
                UPDATE Attributes SET Name = 'lastName' WHERE Name = 'Last name';
                UPDATE Attributes SET Name = 'phone' WHERE Name = 'Phone number';
                UPDATE Attributes SET Name = 'bio' WHERE Name = 'Biography';
                UPDATE Attributes SET Name = 'location' WHERE Name = 'Location';
                UPDATE Attributes SET Name = 'photo' WHERE Name = 'Profile photo';
                """);
        }
    }
}
