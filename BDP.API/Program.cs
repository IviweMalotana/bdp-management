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
builder.Services.AddScoped<BDP.API.Services.ShopifyExportService>();
builder.Services.AddScoped<BDP.API.Services.PaystackService>();
builder.Services.AddScoped<BDP.API.Services.ShippingCalculatorService>();
builder.Services.AddScoped<BDP.API.Services.EmailService>();
builder.Services.AddScoped<BDP.API.Services.OrderEmailService>();
builder.Services.AddScoped<BDP.API.Services.YunExpressService>();
builder.Services.AddScoped<BDP.API.Services.InvoiceService>();
builder.Services.AddScoped<BDP.API.Services.CatalogueImportService>();
builder.Services.AddScoped<BDP.API.Services.GoogleDriveService>();
builder.Services.AddScoped<BDP.API.Services.CurrencyService>();
builder.Services.AddScoped<BDP.API.Services.AIContentService>();
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

// Apply migrations in all environments. A startup-time failure here must never
// take the whole host down before the healthcheck can respond.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        db.Database.Migrate();

        // Defensive, idempotent schema guard: ensure the Supplier columns exist
        // even if migration history has drifted (a missing Designer once stopped
        // AddSupplierFields from being registered/applied, crashing startup with
        // "column s.LeadTimeDays does not exist"). Safe to run every boot.
        db.Database.ExecuteSqlRaw(@"
            ALTER TABLE ""Suppliers"" ADD COLUMN IF NOT EXISTS ""Website"" text;
            ALTER TABLE ""Suppliers"" ADD COLUMN IF NOT EXISTS ""LeadTimeDays"" integer NOT NULL DEFAULT 0;
            ALTER TABLE ""Suppliers"" ADD COLUMN IF NOT EXISTS ""MinOrderQuantity"" integer NOT NULL DEFAULT 0;
            ALTER TABLE ""Suppliers"" ADD COLUMN IF NOT EXISTS ""Notes"" text;
            ALTER TABLE ""ShippingSettings"" ADD COLUMN IF NOT EXISTS ""ShippingMarkupPercent"" numeric(18,4) NOT NULL DEFAULT 40;
            ALTER TABLE ""Orders"" ADD COLUMN IF NOT EXISTS ""ActualShippingCostZAR"" numeric(18,4) NOT NULL DEFAULT 0;
            ALTER TABLE ""ProductVariants"" ADD COLUMN IF NOT EXISTS ""WeightKg"" numeric(18,4) NOT NULL DEFAULT 0;
            ALTER TABLE ""ProductVariants"" ADD COLUMN IF NOT EXISTS ""LengthCm"" numeric(18,4) NOT NULL DEFAULT 0;
            ALTER TABLE ""ProductVariants"" ADD COLUMN IF NOT EXISTS ""WidthCm"" numeric(18,4) NOT NULL DEFAULT 0;
            ALTER TABLE ""ProductVariants"" ADD COLUMN IF NOT EXISTS ""HeightCm"" numeric(18,4) NOT NULL DEFAULT 0;
            ALTER TABLE ""ProductImages"" ADD COLUMN IF NOT EXISTS ""PrintArea"" text;
            CREATE TABLE IF NOT EXISTS ""EmailTemplates"" (
                ""Id"" serial PRIMARY KEY,
                ""Name"" text NOT NULL,
                ""Subject"" text NOT NULL,
                ""HtmlBody"" text NOT NULL,
                ""IsActive"" boolean NOT NULL DEFAULT true,
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
                ""UpdatedAt"" timestamp with time zone NOT NULL DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS ""EmailLogs"" (
                ""Id"" serial PRIMARY KEY,
                ""ToEmail"" text NOT NULL,
                ""ToName"" text NOT NULL,
                ""Subject"" text NOT NULL,
                ""Category"" text,
                ""Status"" text NOT NULL,
                ""Error"" text,
                ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ""IX_EmailLogs_CreatedAt"" ON ""EmailLogs"" (""CreatedAt"" DESC);
            UPDATE ""Products"" SET ""Category"" = 'Jar'     WHERE lower(""Category"") LIKE '%jar%' AND ""Category"" NOT IN ('Jar','Pump','Spray','Serum','Airless','Tube','Shampoo');
            UPDATE ""Products"" SET ""Category"" = 'Pump'    WHERE lower(""Category"") LIKE '%pump%' AND ""Category"" NOT IN ('Jar','Pump','Spray','Serum','Airless','Tube','Shampoo');
            UPDATE ""Products"" SET ""Category"" = 'Pump'    WHERE lower(""Category"") LIKE '%lotion%' AND ""Category"" NOT IN ('Jar','Pump','Spray','Serum','Airless','Tube','Shampoo');
            UPDATE ""Products"" SET ""Category"" = 'Spray'   WHERE (lower(""Category"") LIKE '%spray%' OR lower(""Category"") LIKE '%mist%' OR lower(""Category"") LIKE '%perfume%') AND ""Category"" NOT IN ('Jar','Pump','Spray','Serum','Airless','Tube','Shampoo');
            UPDATE ""Products"" SET ""Category"" = 'Serum'   WHERE (lower(""Category"") LIKE '%serum%' OR lower(""Category"") LIKE '%dropper%' OR lower(""Category"") LIKE '%essential oil%') AND ""Category"" NOT IN ('Jar','Pump','Spray','Serum','Airless','Tube','Shampoo');
            UPDATE ""Products"" SET ""Category"" = 'Airless' WHERE lower(""Category"") LIKE '%airless%' AND ""Category"" NOT IN ('Jar','Pump','Spray','Serum','Airless','Tube','Shampoo');
            UPDATE ""Products"" SET ""Category"" = 'Tube'    WHERE lower(""Category"") LIKE '%tube%' AND ""Category"" NOT IN ('Jar','Pump','Spray','Serum','Airless','Tube','Shampoo');
            UPDATE ""Products"" SET ""Category"" = 'Shampoo' WHERE (lower(""Category"") LIKE '%shampoo%' OR lower(""Category"") LIKE '%conditioner%') AND ""Category"" NOT IN ('Jar','Pump','Spray','Serum','Airless','Tube','Shampoo');");
    }
    catch (Exception ex)
    {
        log.LogError(ex, "Startup migration/schema-guard failed — continuing so the healthcheck can respond");
    }
}


if (app.Environment.IsDevelopment() || Environment.GetEnvironmentVariable("SEED_DATA") == "true")
{
    using var scope = app.Services.CreateScope();
    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db     = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var users  = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roles  = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        await BDP.API.Data.BDPDataSeeder.SeedAsync(db, users, roles);
    }
    catch (Exception ex)
    {
        log.LogError(ex, "Data seeding failed — continuing so the API stays up");
    }
}

// Always update customisation pricing — runs on every deploy regardless of SEED_DATA
using (var scope = app.Services.CreateScope())
{
    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        const decimal cnyRate = 2.60m;
        var customSettings = new[]
        {
            new { Type = "SilkScreen",   CostCNY = 3.4814m, FlatPrice = (decimal?)null,  MOQ = 2500 },
            new { Type = "HotStamping",  CostCNY = 3.5844m, FlatPrice = (decimal?)null,  MOQ = 2500 },
            new { Type = "ColourChange", CostCNY = 0m,      FlatPrice = (decimal?)1.25m, MOQ = 2500 },
        };
        foreach (var s in customSettings)
        {
            var existing = await db.CustomisationSettings.FirstOrDefaultAsync(x => x.Type == s.Type);
            if (existing != null)
            {
                existing.CostPerUnitCNY = s.CostCNY;
                existing.DefaultMinimumQuantity = s.MOQ;
                existing.PricePerUnitZAR = s.FlatPrice
                    ?? Math.Round(s.CostCNY * cnyRate * 1.22m, 4);
            }
        }
        await db.SaveChangesAsync();
    }
    catch (Exception ex)
    {
        log.LogError(ex, "Customisation settings refresh failed — continuing");
    }
}

// Always seed/refresh real per-supplier customisation costs (idempotent)
using (var scope = app.Services.CreateScope())
{
    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await BDP.API.Data.CustomisationCostSeeder.SeedAsync(db);
    }
    catch (Exception ex)
    {
        log.LogError(ex, "Customisation cost seeding failed — continuing");
    }
}

// Always seed email templates if table is empty (idempotent)
using (var scope = app.Services.CreateScope())
{
    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await BDP.API.Data.EmailTemplateSeeder.SeedAsync(db);
    }
    catch (Exception ex)
    {
        log.LogError(ex, "Email template seeding failed — continuing");
    }
}

// Repair any products that were saved with a blank slug (idempotent)
using (var scope = app.Services.CreateScope())
{
    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var blankSlug = await db.Products
            .Where(p => p.Slug == null || p.Slug == "")
            .ToListAsync();
        foreach (var p in blankSlug)
        {
            var s = p.Name.ToLowerInvariant();
            s = System.Text.RegularExpressions.Regex.Replace(s, @"[^a-z0-9\s-]", "");
            s = System.Text.RegularExpressions.Regex.Replace(s, @"\s+", "-");
            p.Slug = s.Trim('-') + "-" + p.Id;
        }
        if (blankSlug.Any())
        {
            await db.SaveChangesAsync();
            log.LogInformation("Repaired {Count} products with blank slugs", blankSlug.Count);
        }
    }
    catch (Exception ex)
    {
        log.LogError(ex, "Slug repair failed — continuing");
    }
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
