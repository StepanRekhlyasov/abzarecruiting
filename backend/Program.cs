using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Backend.Api.Configuration;
using Backend.Api.Data;
using Backend.Api.Data.Seeders;
using Backend.Api.Middleware;
using Backend.Api.Services.Auth;
using Backend.Api.Services.Attribute;
using Backend.Api.Services.Attributes;
using Backend.Api.Services.Email;
using Backend.Api.Services.Position;
using Backend.Api.Services.Profile;
using Backend.Api.Services.Project;
using Backend.Api.Services.Restriction;
using Backend.Api.Services.Resume;
using Backend.Api.Services.Tag;
using Backend.Api.Services.Message;
using Backend.Api.Services.Files;
using Backend.Api.Services.User;
using Backend.Api.WebSockets;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Microsoft.Extensions.Options;
using QuestPDF.Infrastructure;

QuestPDF.Settings.License = LicenseType.Community;

Backend.Api.EnvFileLoader.Load(
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(AppContext.BaseDirectory, ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
builder.Services.Configure<AppSettings>(builder.Configuration.GetSection(AppSettings.SectionName));
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection(SmtpSettings.SectionName));
builder.Services.Configure<AuthenticationSettings>(
    builder.Configuration.GetSection(AuthenticationSettings.SectionName));
builder.Services.Configure<DefaultAttributesSettings>(
    builder.Configuration.GetSection(DefaultAttributesSettings.SectionName));
builder.Services.Configure<FileStorageSettings>(
    builder.Configuration.GetSection(FileStorageSettings.SectionName));
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = FileStorageSettings.DefaultMaxFileSizeBytes;
});
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor
        | ForwardedHeaders.XForwardedProto
        | ForwardedHeaders.XForwardedHost;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = FileStorageSettings.DefaultMaxFileSizeBytes;
});

var dataProtectionKeysPath = Path.Combine(builder.Environment.ContentRootPath, "dataprotection-keys");
Directory.CreateDirectory(dataProtectionKeysPath);
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath))
    .SetApplicationName("Backend.Api");

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseMySQL(connectionString));

builder.Services
    .AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = 1;
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedEmail = false;
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
        options.Lockout.MaxFailedAccessAttempts = 5;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("JWT settings are not configured.");
var authenticationSettings = builder.Configuration.GetSection(AuthenticationSettings.SectionName)
    .Get<AuthenticationSettings>() ?? new AuthenticationSettings();

var authenticationBuilder = builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = JwtRegisteredClaimNames.Sub,
            RoleClaimType = "role",
        };
    });

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

builder.Services.ConfigureExternalCookie(options =>
{
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

static void ConfigureExternalOAuthCookies(Microsoft.AspNetCore.Authentication.RemoteAuthenticationOptions options)
{
    options.CorrelationCookie.SameSite = SameSiteMode.Lax;
    options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    options.CorrelationCookie.HttpOnly = true;
    options.CorrelationCookie.IsEssential = true;
}

static void ConfigureRemoteFailure(
    Microsoft.AspNetCore.Authentication.RemoteAuthenticationOptions options,
    IConfiguration configuration)
{
    options.Events.OnRemoteFailure = context =>
    {
        var frontendBase = configuration["App:FrontendBaseUrl"]?.TrimEnd('/') ?? "http://localhost:8000";
        var request = context.Request;
        if (!string.IsNullOrWhiteSpace(request.Host.Value))
        {
            frontendBase = $"{request.Scheme}://{request.Host.Value}";
        }

        context.Response.Redirect($"{frontendBase}/login?error=error.auth.externalLoginFailed");
        context.HandleResponse();
        return Task.CompletedTask;
    };
}

if (authenticationSettings.Google.IsConfigured)
{
    authenticationBuilder.AddGoogle(options =>
    {
        options.ClientId = authenticationSettings.Google.ClientId;
        options.ClientSecret = authenticationSettings.Google.ClientSecret;
        options.SignInScheme = IdentityConstants.ExternalScheme;
        options.SaveTokens = false;
        options.Scope.Add("email");
        options.Scope.Add("profile");
        ConfigureExternalOAuthCookies(options);
        ConfigureRemoteFailure(options, builder.Configuration);
    });
}

if (authenticationSettings.Facebook.IsConfigured)
{
    authenticationBuilder.AddFacebook(options =>
    {
        options.AppId = authenticationSettings.Facebook.AppId;
        options.AppSecret = authenticationSettings.Facebook.AppSecret;
        options.SignInScheme = IdentityConstants.ExternalScheme;
        options.Fields.Add("email");
        options.Fields.Add("name");
        options.Fields.Add("first_name");
        options.Fields.Add("last_name");
        ConfigureExternalOAuthCookies(options);
        ConfigureRemoteFailure(options, builder.Configuration);
    });
}

builder.Services.AddAuthorization();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IExternalAuthService, ExternalAuthService>();
builder.Services.AddScoped<IAccountEmailService, AccountEmailService>();
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<IProfileAttributeService, ProfileAttributeService>();
builder.Services.AddScoped<IAttributeValueMapper, AttributeValueMapper>();
builder.Services.AddScoped<IPositionRestrictionEvaluator, PositionRestrictionEvaluator>();
builder.Services.AddScoped<IPositionService, PositionService>();
builder.Services.AddScoped<IRestrictionService, RestrictionService>();
builder.Services.AddScoped<IAttributeService, AttributeService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<IResumeService, ResumeService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IPositionMessageService, PositionMessageService>();
builder.Services.AddSingleton<NotificationWebSocketHandler>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Backend API",
        Version = "v1",
        Description = "Web API for the frontend project",
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT Authorization header using the Bearer scheme.",
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = [],
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:5173"])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.Migrate();

    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    await IdentitySeeder.SeedRolesAsync(roleManager);

    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>()
        .CreateLogger("Startup");
    var defaultAttributesSettings = scope.ServiceProvider
        .GetRequiredService<IOptions<DefaultAttributesSettings>>();
    var seedFileStorageSettings = scope.ServiceProvider.GetRequiredService<IOptions<FileStorageSettings>>();
    var profileAttributeService = scope.ServiceProvider.GetRequiredService<IProfileAttributeService>();
    await AttributeSeeder.SeedAsync(db, userManager, profileAttributeService, defaultAttributesSettings, logger);
    await UserSeeder.SeedAsync(
        db,
        userManager,
        profileAttributeService,
        seedFileStorageSettings,
        app.Environment,
        logger);
    await MockDataSeeder.SeedAsync(db, userManager, logger);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Backend API v1");
        options.RoutePrefix = "swagger";
    });
}

var fileStorageSettings = app.Services.GetRequiredService<IOptions<FileStorageSettings>>().Value;
var uploadsRootPath = Path.IsPathRooted(fileStorageSettings.RootPath)
    ? fileStorageSettings.RootPath
    : Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, fileStorageSettings.RootPath));
Directory.CreateDirectory(uploadsRootPath);

app.UseForwardedHeaders();
app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRootPath),
    RequestPath = fileStorageSettings.RequestPath.TrimEnd('/'),
});
app.UseWebSockets();
app.UseAuthentication();
app.UseMiddleware<RejectLockedOutUsersMiddleware>();
app.UseAuthorization();

app.MapControllers();
app.Map("/ws/notifications", async (HttpContext context, NotificationWebSocketHandler handler) =>
{
    await handler.HandleAsync(context);
});

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck")
    .WithTags("Health");

app.Run();
