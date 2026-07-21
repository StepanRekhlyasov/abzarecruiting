using Backend.Api.Data.Entities;
using Backend.Api.Data.Relations;
using AttributeEntity = Backend.Api.Data.Entities.Attribute;
using FileEntity = Backend.Api.Data.Entities.File;
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
    public DbSet<AttributeOption> AttributeOptions => Set<AttributeOption>();
    public DbSet<AttributeValidation> AttributeValidations => Set<AttributeValidation>();
    public DbSet<ProfileAttribute> ProfileAttributes => Set<ProfileAttribute>();
    public DbSet<Position> Positions => Set<Position>();
    public DbSet<PositionRestriction> PositionRestrictions => Set<PositionRestriction>();
    public DbSet<Resume> Resumes => Set<Resume>();
    public DbSet<ProfileProject> ProfileProjects => Set<ProfileProject>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<ProfileProjectTag> ProfileProjectTags => Set<ProfileProjectTag>();
    public DbSet<PositionTag> PositionTags => Set<PositionTag>();
    public DbSet<PositionAttribute> PositionAttributes => Set<PositionAttribute>();
    public DbSet<LikesResume> LikesResumes => Set<LikesResume>();
    public DbSet<PositionMessage> PositionMessages => Set<PositionMessage>();
    public DbSet<FileEntity> Files => Set<FileEntity>();

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

            entity.Property(attribute => attribute.Category)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(attribute => attribute.ValueType)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(attribute => attribute.InputType)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(attribute => attribute.CreatedAt)
                .HasColumnType("datetime(6)");

            entity.Property(attribute => attribute.Version)
                .HasDefaultValue(0);

            entity.HasOne(attribute => attribute.CreatedBy)
                .WithMany()
                .HasForeignKey(attribute => attribute.CreatedById)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(attribute => attribute.Name)
                .IsUnique();
        });

        builder.Entity<AttributeOption>(entity =>
        {
            entity.Property(option => option.InputOption)
                .HasMaxLength(256)
                .IsRequired();

            entity.HasOne(option => option.Attribute)
                .WithMany(attribute => attribute.Options)
                .HasForeignKey(option => option.AttributeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(option => new { option.AttributeId, option.InputOption })
                .IsUnique();
        });

        builder.Entity<AttributeValidation>(entity =>
        {
            entity.Property(validation => validation.ValidationType)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(validation => validation.ValidationValue)
                .HasMaxLength(1024)
                .IsRequired();

            entity.HasOne(validation => validation.Attribute)
                .WithMany(attribute => attribute.Validations)
                .HasForeignKey(validation => validation.AttributeId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(validation => new { validation.AttributeId, validation.ValidationType })
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

            entity.Property(profileAttribute => profileAttribute.Version)
                .HasDefaultValue(0);

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

            entity.Property(position => position.Description)
                .HasMaxLength(1024);

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

            entity.Property(position => position.MaxProjects)
                .IsRequired();

            entity.Property(position => position.CreatedAt)
                .HasColumnType("datetime(6)");

            entity.Property(position => position.Version)
                .HasDefaultValue(0);

            entity.HasOne(position => position.CreatedBy)
                .WithMany()
                .HasForeignKey(position => position.CreatedById)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });
        builder.Entity<PositionRestriction>(entity =>
        {
            entity.Property(restriction => restriction.Condition)
                .HasConversion<string>()
                .HasMaxLength(32)
                .IsRequired();

            entity.Property(restriction => restriction.CreatedAt)
                .HasColumnType("datetime(6)");

            entity.Property(restriction => restriction.Version)
                .HasDefaultValue(0);

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
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

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

            entity.Property(resume => resume.Version)
                .HasDefaultValue(0);

            entity.HasOne(resume => resume.Candidate)
                .WithMany(user => user.Resumes)
                .HasForeignKey(resume => resume.CandidateId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(resume => resume.Position)
                .WithMany(position => position.Resumes)
                .HasForeignKey(resume => resume.PositionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(resume => new { resume.CandidateId, resume.PositionId })
                .IsUnique();
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

            entity.Property(tag => tag.Version)
                .HasDefaultValue(0);

            entity.HasOne(tag => tag.CreatedBy)
                .WithMany()
                .HasForeignKey(tag => tag.CreatedById)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
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

        builder.Entity<LikesResume>(entity =>
        {
            entity.ToTable("LikesResume");

            entity.HasKey(like => new { like.UserId, like.ResumeId });

            entity.Property(like => like.CreatedAt)
                .HasColumnType("datetime(6)");

            entity.HasOne(like => like.User)
                .WithMany(user => user.ResumeLikes)
                .HasForeignKey(like => like.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(like => like.Resume)
                .WithMany(resume => resume.Likes)
                .HasForeignKey(like => like.ResumeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<PositionMessage>(entity =>
        {
            entity.ToTable("PositionMessages");

            entity.HasKey(message => message.Id);

            entity.Property(message => message.Content)
                .HasColumnType("longtext")
                .IsRequired();

            entity.Property(message => message.CreatedById)
                .HasMaxLength(255);

            entity.Property(message => message.CreatedAt)
                .HasColumnType("datetime(6)");

            entity.HasIndex(message => message.PositionId);
            entity.HasIndex(message => message.CreatedAt);

            entity.HasOne(message => message.Position)
                .WithMany(position => position.Messages)
                .HasForeignKey(message => message.PositionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(message => message.CreatedBy)
                .WithMany(user => user.PositionMessages)
                .HasForeignKey(message => message.CreatedById)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<FileEntity>(entity =>
        {
            entity.HasKey(file => file.Uid);

            entity.Property(file => file.Url)
                .HasMaxLength(2048)
                .IsRequired();

            entity.Property(file => file.Name)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(file => file.Size)
                .IsRequired();
        });
    }
}
