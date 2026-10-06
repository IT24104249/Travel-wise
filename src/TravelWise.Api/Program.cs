using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json.Serialization;
using TravelWise.Api.Data;
using TravelWise.Api.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
var supabaseUrl = builder.Configuration["Supabase:Url"];
if (!string.IsNullOrWhiteSpace(supabaseUrl))
{
    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
    {
        options.Authority = $"{supabaseUrl.TrimEnd('/')}/auth/v1";
        options.Audience = "authenticated";
        options.RequireHttpsMetadata = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            NameClaimType = "email",
            RoleClaimType = "role"
        };
    });
    builder.Services.AddAuthorization(options =>
    {
        static bool HasApplicationRole(AuthorizationHandlerContext context, params string[] roles) =>
            context.User.Claims
                .Where(claim => claim.Type is "role" or "user_role" or "app_role")
                .SelectMany(claim => claim.Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                .Concat(context.User.Claims
                    .Where(claim => claim.Type == "app_metadata")
                    .SelectMany(claim =>
                    {
                        try
                        {
                            using var metadata = System.Text.Json.JsonDocument.Parse(claim.Value);
                            return metadata.RootElement.TryGetProperty("role", out var role)
                                ? new[] { role.GetString() ?? string.Empty }
                                : Array.Empty<string>();
                        }
                        catch (System.Text.Json.JsonException)
                        {
                            return Array.Empty<string>();
                        }
                    }))
                .Any(value => roles.Contains(value, StringComparer.OrdinalIgnoreCase));

        options.AddPolicy("ProviderOrAdmin", policy => policy.RequireAssertion(context =>
            context.User.Identity?.IsAuthenticated == true &&
            HasApplicationRole(context, "ServiceProvider", "StaffAdmin")));
        options.AddPolicy("StaffAdmin", policy => policy.RequireAssertion(context =>
            context.User.Identity?.IsAuthenticated == true &&
            HasApplicationRole(context, "StaffAdmin")));
    });
}
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks().AddDbContextCheck<TravelWiseDbContext>("supabase-database");
builder.Services.AddHttpClient<AiWorkflowClient>();
builder.Services.AddDbContext<TravelWiseDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Supabase")));
builder.Services.AddScoped<TravelWiseService>();
builder.Services.AddCors(options => options.AddPolicy("clients", policy =>
    policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("clients");
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health");
app.MapControllers();
app.Run();
