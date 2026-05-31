using BDP.API.Data;
using BDP.API.Models;
using BDP.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ── PORT (Railway injects this) ────────────────────────────────────────────
var port = Environment.GetEnvironmentVariable("PORT") ?? "5252";

// ── wwwroot discovery ──────────────────────────────────────────────────────
var searchDir = AppContext.BaseDirectory;
string? wwwrootPath = null;
for (int i = 0; i < 5; i++)
{
    var candidate = Path.Combine(searchDir, "wwwroot");
    if (Directory.Exists(candidate)) { wwwrootPath = candidate; break; }
    searchDir = Path.GetFullPath(Path.Combine(searchDir, ".."));
}
if (wwwrootPath != null)
    builder.Environment.WebRootPath = wwwrootPath;

// Ensure upload directories exist (Railway ephemeral FS — files lost on redeploy)
var uploadsBase = wwwrootPath ?? Path.Combine(AppContext.BaseDirectory, "wwwroot");
Directory.CreateDirectory(Path.Combine(uploadsBase, "uploads", "artwork"));
Directory.CreateDirectory(Path.Combine(uploadsBase, "invoices"));

// ── Connection string ──────────────────────────────────────────────────────
// Railway provides DATABASE_URL as postgresql://user:pass@host:port/db
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
string connectionString;
if (!string.IsNullOrWhiteSpace(databaseUrl))
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':');
    var dbPort = uri.Port > 0 ? uri.Port : 5432;
    connectionString =
        $"Host={uri.Host};Port={dbPort};Database={uri.AbsolutePath.TrimStart('/')};" +
        $"Username={userInfo[0]};Password={userInfo[1]};" +
        $"SSL Mode=Require;Trust Server Certificate=true";
}
else
{
    connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("No connection string configured.");
}

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "BDP API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header. Format: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddIdentityCore<ApplicationUser>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<AppDbContext>()
.AddSignInManager<SignInManager<ApplicationUser>>()
.AddDefaultTokenProviders();

var jwtSecret =
    (Environment.GetEnvironmentVariable("JWT_SECRET") is { Length: > 0 } envSecret ? envSecret : null)
    ?? (builder.Configuration["JWT:Secret"] is { Length: > 0 } cfgSecret ? cfgSecret : null)
    ?? throw new InvalidOperationException("JWT secret not configured. Set JWT_SECRET env var (production) or JWT:Secret in appsettings.Development.json (local).");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JWT:Issuer"],
        ValidAudience = builder.Configuration["JWT:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});

var storefrontUrl = Environment.GetEnvironmentVariable("STOREFRONT_URL") ?? "http://localhost:3000";
var allowedOrigins = (Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")
    ?? builder.Configuration["AllowedOrigins"]
    ?? "http://localhost:5173,http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    .Append(storefrontUrl)
    .Distinct()
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod());
});

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<BDP.API.Services.PricingService>();
builder.Services.AddScoped<BDP.API.Services.AIContentService>();
builder.Services.AddScoped<BDP.API.Services.ShopifyExportService>();
builder.Services.AddScoped<BDP.API.Services.PaystackService>();
builder.Services.AddScoped<BDP.API.Services.ShippingCalculatorService>();
builder.Services.AddScoped<BDP.API.Services.EmailService>();
builder.Services.AddScoped<BDP.API.Services.YunExpressService>();
builder.Services.AddScoped<BDP.API.Services.InvoiceService>();
builder.Services.AddScoped<BDP.API.Services.CatalogueImportService>();
builder.Services.AddScoped<BDP.API.Services.GoogleDriveService>();   // Used for uploading AI-generated product images
builder.Services.AddScoped<BDP.API.Services.CurrencyService>();
builder.Services.AddSingleton<BDP.API.Services.RecurringOrderService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<BDP.API.Services.RecurringOrderService>());

var app = builder.Build();

if (!app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "BDP API v1"));
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

// Apply migrations + seed in all environments
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment() || Environment.GetEnvironmentVariable("SEED_DATA") == "true")
{
    using var scope = app.Services.CreateScope();
    var db     = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var users  = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var roles  = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    await BDP.API.Data.BDPDataSeeder.SeedAsync(db, users, roles);
}

// Fire-and-forget currency rate refresh on startup (non-blocking)
_ = Task.Run(async () =>
{
    await Task.Delay(5000); // Allow DB to be ready
    using var scope = app.Services.CreateScope();
    var currencySvc = scope.ServiceProvider.GetRequiredService<BDP.API.Services.CurrencyService>();
    await currencySvc.RefreshRatesAsync();
});

app.Run($"http://0.0.0.0:{port}");
