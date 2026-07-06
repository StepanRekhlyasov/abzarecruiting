using Backend.Api.Data.Entities;
using Backend.Api.Data.Relations;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Backend.Api.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<AttributeEntity> Attributes => Set<AttributeEntity>();
    public DbSet<ProfileAttribute> ProfileAttributes => Set<ProfileAttribute>();
    public DbSet<Position> Positions => Set<Position>();
    public DbSet<PositionRestriction> PositionRestrictions => Set<PositionRestriction>();
    public DbSet<Resume> Resumes => Set<Resume>();
    public DbSet<ProfileProject> ProfileProjects => Set<ProfileProject>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<ProfileProjectTag> ProfileProjectTags => Set<ProfileProjectTag>();
    public DbSet<PositionTag> PositionTags => Set<PositionTag>();
    public DbSet<PositionAttribute> PositionAttributes => Set<PositionAttribute>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(user => user.CreatedAt)
                .HasColumnType("datetime(6)");
        });

        builder.Entity<AttributeEntity>(entity =>
        {
            entity.Property(attribute => attribute.Name)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(attribute => attribute.Description)
                .HasMaxLength(1024);

            entity.Property(attribute => attribute.ValueType)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(attribute => attribute.InputType)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(attribute => attribute.CreatedAt)
                .HasColumnType("datetime(6)");

            entity.HasOne(attribute => attribute.CreatedBy)
                .WithMany()
                .HasForeignKey(attribute => attribute.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(attribute => attribute.Name)
                .IsUnique();
        });

        builder.Entity<ProfileAttribute>(entity =>
        {
            entity.HasKey(profileAttribute => new { profileAttribute.CandidateId, profileAttribute.AttributeId });

            entity.Property(profileAttribute => profileAttribute.ValueDate)
                .HasColumnType("datetime(6)");

            entity.Property(profileAttribute => profileAttribute.ValueDateFrom)
                .HasColumnType("datetime(6)");

            entity.Property(profileAttribute => profileAttribute.ValueDateTo)
                .HasColumnType("datetime(6)");

            entity.HasOne(profileAttribute => profileAttribute.Candidate)
                .WithMany(user => user.ProfileAttributes)
                .HasForeignKey(profileAttribute => profileAttribute.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(profileAttribute => profileAttribute.Attribute)
                .WithMany(attribute => attribute.ProfileAttributes)
                .HasForeignKey(profileAttribute => profileAttribute.AttributeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Position>(entity =>
        {
            entity.Property(position => position.Name)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(position => position.Company)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(position => position.Country)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(position => position.Level)
                .HasConversion<string>()
                .HasMaxLength(32)
                .IsRequired();

            entity.Property(position => position.Format)
                .HasConversion<string>()
                .HasMaxLength(32)
                .IsRequired();

            entity.Property(position => position.CreatedAt)
                .HasColumnType("datetime(6)");

            entity.HasOne(position => position.CreatedBy)
                .WithMany()
                .HasForeignKey(position => position.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<PositionRestriction>(entity =>
        {
            entity.Property(restriction => restriction.Condition)
                .HasConversion<string>()
                .HasMaxLength(32)
                .IsRequired();

            entity.Property(restriction => restriction.CreatedAt)
                .HasColumnType("datetime(6)");

            entity.HasOne(restriction => restriction.Position)
                .WithMany(position => position.PositionRestrictions)
                .HasForeignKey(restriction => restriction.PositionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(restriction => restriction.Attribute)
                .WithMany(attribute => attribute.PositionRestrictions)
                .HasForeignKey(restriction => restriction.AttributeId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(restriction => restriction.CreatedBy)
                .WithMany()
                .HasForeignKey(restriction => restriction.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(restriction => restriction.Tag)
                .WithMany(tag => tag.PositionRestrictions)
                .HasForeignKey(restriction => restriction.TagId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Resume>(entity =>
        {
            entity.Property(resume => resume.Published)
                .HasColumnType("tinyint(1)");

            entity.Property(resume => resume.CreatedAt)
                .HasColumnType("datetime(6)");

            entity.HasOne(resume => resume.Candidate)
                .WithMany(user => user.Resumes)
                .HasForeignKey(resume => resume.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(resume => resume.Position)
                .WithMany(position => position.Resumes)
                .HasForeignKey(resume => resume.PositionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ProfileProject>(entity =>
        {
            entity.Property(profileProject => profileProject.Name)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(profileProject => profileProject.StartAt)
                .HasColumnType("datetime(6)");

            entity.Property(profileProject => profileProject.EndAt)
                .HasColumnType("datetime(6)");

            entity.Property(profileProject => profileProject.CreatedAt)
                .HasColumnType("datetime(6)");

            entity.HasOne(profileProject => profileProject.Candidate)
                .WithMany(user => user.ProfileProjects)
                .HasForeignKey(profileProject => profileProject.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Tag>(entity =>
        {
            entity.Property(tag => tag.Name)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(tag => tag.CreatedAt)
                .HasColumnType("datetime(6)");

            entity.HasOne(tag => tag.CreatedBy)
                .WithMany()
                .HasForeignKey(tag => tag.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ProfileProjectTag>(entity =>
        {
            entity.HasKey(profileProjectTag => new { profileProjectTag.ProfileProjectId, profileProjectTag.TagId });

            entity.HasOne(profileProjectTag => profileProjectTag.ProfileProject)
                .WithMany(profileProject => profileProject.ProfileProjectTags)
                .HasForeignKey(profileProjectTag => profileProjectTag.ProfileProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(profileProjectTag => profileProjectTag.Tag)
                .WithMany(tag => tag.ProfileProjectTags)
                .HasForeignKey(profileProjectTag => profileProjectTag.TagId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<PositionTag>(entity =>
        {
            entity.HasKey(positionTag => new { positionTag.PositionId, positionTag.TagId });

            entity.Property(positionTag => positionTag.IsKey)
                .HasColumnType("tinyint(1)");

            entity.HasOne(positionTag => positionTag.Position)
                .WithMany(position => position.PositionTags)
                .HasForeignKey(positionTag => positionTag.PositionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(positionTag => positionTag.Tag)
                .WithMany(tag => tag.PositionTags)
                .HasForeignKey(positionTag => positionTag.TagId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<PositionAttribute>(entity =>
        {
            entity.HasKey(positionAttribute => new { positionAttribute.PositionId, positionAttribute.AttributeId });

            entity.Property(positionAttribute => positionAttribute.IsKey)
                .HasColumnType("tinyint(1)");

            entity.HasOne(positionAttribute => positionAttribute.Position)
                .WithMany(position => position.PositionAttributes)
                .HasForeignKey(positionAttribute => positionAttribute.PositionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(positionAttribute => positionAttribute.Attribute)
                .WithMany(attribute => attribute.PositionAttributes)
                .HasForeignKey(positionAttribute => positionAttribute.AttributeId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
