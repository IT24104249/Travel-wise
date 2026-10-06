using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Contracts;
using TravelWise.Api.Data;
using TravelWise.Api.Models;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/auth")]
public sealed class AuthController(IHttpClientFactory clients, IConfiguration configuration, TravelWiseDbContext db) : ControllerBase
{
    [AllowAnonymous, HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] AuthCredentials credentials, [FromHeader(Name = "X-User-Role")] string? requestedRole, CancellationToken ct)
    {
        var email = credentials.Email.Trim().ToLowerInvariant();

        // Check Service Provider Manual Verification Rule
        if (string.Equals(requestedRole, "ServiceProvider", StringComparison.OrdinalIgnoreCase))
        {
            var app = await db.ProviderRegistrations.FirstOrDefaultAsync(x => x.Email.ToLower() == email, ct);
            if (app is not null)
            {
                if (app.Status == ProviderApprovalStatus.Rejected)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        error = "Admin rejected your Service Provider registration request. Your account has been denied access to the Service Provider portal."
                    });
                }
                if (app.Status == ProviderApprovalStatus.Pending)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        error = "Your Service Provider registration is currently pending Admin verification. Please wait until an Administrator approves your request."
                    });
                }
            }
        }

        return await ForwardAuthRequestAsync("/auth/v1/token?grant_type=password", credentials, ct);
    }

    [AllowAnonymous, HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
    {
        var targetRole = string.IsNullOrWhiteSpace(request.Role) ? "User" : request.Role.Trim();
        if (targetRole.Equals("StaffAdmin", StringComparison.OrdinalIgnoreCase) || targetRole.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { error = "Admin accounts cannot be registered publicly. They must be pre-seeded by system management." });
        }

        var isProvider = targetRole.Equals("ServiceProvider", StringComparison.OrdinalIgnoreCase);
        var email = request.Email.Trim().ToLowerInvariant();

        if (isProvider)
        {
            var existingApp = await db.ProviderRegistrations.FirstOrDefaultAsync(x => x.Email.ToLower() == email, ct);
            if (existingApp is not null)
            {
                if (existingApp.Status == ProviderApprovalStatus.Rejected)
                {
                    return BadRequest(new { error = "A previous Service Provider application for this email was rejected by an Administrator." });
                }
                if (existingApp.Status == ProviderApprovalStatus.Pending)
                {
                    return BadRequest(new { error = "A Service Provider application for this email is already pending Admin verification." });
                }
            }
            else
            {
                var newApp = new ProviderRegistration
                {
                    Email = email,
                    BusinessName = request.DisplayName?.Trim() ?? email.Split('@')[0],
                    ContactPhone = request.ContactPhone?.Trim(),
                    ServiceType = request.ServiceType?.Trim() ?? "Travel Services",
                    Status = ProviderApprovalStatus.Pending
                };
                db.ProviderRegistrations.Add(newApp);
                await db.SaveChangesAsync(ct);
            }
        }

        var payload = new
        {
            email = request.Email,
            password = request.Password,
            data = new
            {
                role = isProvider ? "ServiceProvider" : "User",
                display_name = request.DisplayName ?? request.Email.Split('@')[0],
                is_provider_pending = isProvider
            }
        };

        var response = await ForwardRawAuthRequestAsync("/auth/v1/signup", payload, ct);
        if (isProvider && response is OkObjectResult okResult)
        {
            return Ok(new
            {
                session = okResult.Value,
                status = "PendingVerification",
                message = "Service Provider application submitted successfully. An Administrator will manually verify your request before your portal access becomes active."
            });
        }

        return response;
    }

    [AllowAnonymous, HttpGet("provider-status")]
    public async Task<IActionResult> GetProviderStatus([FromQuery] string email, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(email)) return BadRequest(new { error = "Email is required." });
        var app = await db.ProviderRegistrations.FirstOrDefaultAsync(x => x.Email.ToLower() == email.Trim().ToLower(), ct);
        if (app is null) return Ok(new { status = "None", message = "No provider application found for this email." });
        return Ok(app);
    }

    [AllowAnonymous, HttpGet("provider-applications")]
    public async Task<IActionResult> GetProviderApplications(CancellationToken ct)
    {
        var list = await db.ProviderRegistrations.OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
        return Ok(list);
    }

    [AllowAnonymous, HttpPost("provider-applications/{id:guid}/approve")]
    public async Task<IActionResult> ApproveProviderApplication(Guid id, [FromBody] ProviderApprovalActionRequest? req, CancellationToken ct)
    {
        var app = await db.ProviderRegistrations.FindAsync([id], ct);
        if (app is null) return NotFound(new { error = "Provider application not found." });

        app.Status = ProviderApprovalStatus.Approved;
        app.AdminNote = req?.Note ?? "Approved by Administrator";
        app.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        db.AuditLogs.Add(new AuditLog
        {
            WorkflowId = Guid.Empty,
            EventType = "PROVIDER_APPLICATION_APPROVED",
            Details = $"Service Provider application for {app.Email} ({app.BusinessName}) was approved by Admin."
        });
        await db.SaveChangesAsync(ct);

        return Ok(app);
    }

    [AllowAnonymous, HttpPost("provider-applications/{id:guid}/reject")]
    public async Task<IActionResult> RejectProviderApplication(Guid id, [FromBody] ProviderApprovalActionRequest? req, CancellationToken ct)
    {
        var app = await db.ProviderRegistrations.FindAsync([id], ct);
        if (app is null) return NotFound(new { error = "Provider application not found." });

        app.Status = ProviderApprovalStatus.Rejected;
        app.AdminNote = req?.Note ?? "Rejected by Administrator";
        app.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        db.AuditLogs.Add(new AuditLog
        {
            WorkflowId = Guid.Empty,
            EventType = "PROVIDER_APPLICATION_REJECTED",
            Details = $"Service Provider application for {app.Email} was rejected by Admin. Note: {app.AdminNote}"
        });
        await db.SaveChangesAsync(ct);

        return Ok(app);
    }

    private async Task<IActionResult> ForwardAuthRequestAsync(string path, AuthCredentials credentials, CancellationToken ct) =>
        await ForwardRawAuthRequestAsync(path, credentials, ct);

    private async Task<IActionResult> ForwardRawAuthRequestAsync(string path, object body, CancellationToken ct)
    {
        var supabaseUrl = configuration["Supabase:Url"];
        var anonKey = configuration["Supabase:AnonKey"];
        if (string.IsNullOrWhiteSpace(supabaseUrl) || string.IsNullOrWhiteSpace(anonKey))
            return Problem("Supabase Auth is not configured on the API.", statusCode: StatusCodes.Status503ServiceUnavailable);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl.TrimEnd('/')}{path}")
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("apikey", anonKey);

        var response = await clients.CreateClient().SendAsync(request, ct);
        var content = await response.Content.ReadAsStringAsync(ct);
        if (response.IsSuccessStatusCode)
        {
            try
            {
                var session = JsonSerializer.Deserialize<AuthSession>(content, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                return session is not null
                    ? Ok(session)
                    : Ok(JsonSerializer.Deserialize<JsonElement>(content));
            }
            catch (JsonException)
            {
                return StatusCode(StatusCodes.Status502BadGateway, new { error = "Supabase Auth returned an invalid response." });
            }
        }

        var status = response.StatusCode == HttpStatusCode.BadRequest
            ? StatusCodes.Status400BadRequest
            : StatusCodes.Status502BadGateway;
        return StatusCode(status, new { error = ExtractAuthError(content) });
    }

    private static string ExtractAuthError(string content)
    {
        try
        {
            using var document = JsonDocument.Parse(content);
            var root = document.RootElement;
            foreach (var name in new[] { "msg", "message", "error_description", "error" })
                if (root.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String)
                    return value.GetString() ?? "Authentication failed.";
        }
        catch (JsonException) { }
        return "Authentication failed.";
    }
}
