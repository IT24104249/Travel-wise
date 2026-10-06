using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Contracts;
using TravelWise.Api.Data;
using TravelWise.Api.Models;
using TravelWise.Api.Services;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/catalog")]
public sealed class CatalogController(TravelWiseDbContext db, TravelWiseService service) : ControllerBase
{
    private string GetCurrentUserId()
    {
        var headerUser = Request.Headers["X-User-Id"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(headerUser)) return headerUser;
        return User.FindFirst("sub")?.Value ?? User.Identity?.Name ?? "provider-user";
    }

    private string GetCurrentRole()
    {
        var headerRole = Request.Headers["X-User-Role"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(headerRole)) return headerRole;
        if (User.IsInRole("StaffAdmin")) return "StaffAdmin";
        if (User.IsInRole("ServiceProvider")) return "ServiceProvider";
        return "User";
    }

    [AllowAnonymous, HttpGet]
    public async Task<IActionResult> Search([FromQuery] string? destination, [FromQuery] CatalogItemType? type, [FromQuery] string? category, CancellationToken ct)
    {
        var query = db.TravelCatalogItems.Where(x => x.IsActive && x.IsApproved);
        if (!string.IsNullOrWhiteSpace(destination))
        {
            var destLower = destination.Trim().ToLower();
            query = query.Where(x => x.Destination.ToLower().Contains(destLower));
        }
        if (type is not null) query = query.Where(x => x.Type == type);
        if (!string.IsNullOrWhiteSpace(category))
        {
            var catLower = category.Trim().ToLower();
            query = query.Where(x => x.CuisineOrCategory != null && x.CuisineOrCategory.ToLower().Contains(catLower));
        }
        return Ok(await query.OrderByDescending(x => x.Rating).ThenBy(x => x.Name).ToListAsync(ct));
    }

    [AllowAnonymous, HttpGet("all")]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false, CancellationToken ct = default)
    {
        var query = db.TravelCatalogItems.AsQueryable();
        if (!includeInactive) query = query.Where(x => x.IsActive);
        return Ok(await query.OrderByDescending(x => x.CreatedAt).ToListAsync(ct));
    }

    [AllowAnonymous, HttpGet("mine")]
    public async Task<IActionResult> Mine([FromQuery] string? providerId, CancellationToken ct = default)
    {
        var userId = !string.IsNullOrWhiteSpace(providerId) ? providerId : GetCurrentUserId();
        return Ok(await db.TravelCatalogItems.Where(x => x.ProviderUserId == userId && x.IsActive).OrderByDescending(x => x.CreatedAt).ToListAsync(ct));
    }

    [AllowAnonymous, HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var item = await service.GetCatalogItemAsync(id, ct);
        return item is not null ? Ok(item) : NotFound();
    }

    [AllowAnonymous, HttpPost]
    public async Task<IActionResult> Create(CreateCatalogItemRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Destination))
            return BadRequest(new { error = "Name and destination are required." });
        if (request.Price is < 0 || request.Rating is < 0 or > 5)
            return BadRequest(new { error = "Price cannot be negative and rating must be between 0 and 5." });

        var role = GetCurrentRole();
        var item = new TravelCatalogItem
        {
            Type = request.Type,
            Name = request.Name.Trim(),
            Destination = request.Destination.Trim(),
            Description = request.Description.Trim(),
            Address = request.Address?.Trim(),
            Contact = request.Contact?.Trim(),
            Price = request.Price,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "LKR" : request.Currency.Trim().ToUpperInvariant(),
            CuisineOrCategory = request.CuisineOrCategory?.Trim(),
            Rating = request.Rating ?? 4.5m,
            ProviderUserId = GetCurrentUserId(),
            IsApproved = role.Equals("StaffAdmin", StringComparison.OrdinalIgnoreCase) || role.Equals("Admin", StringComparison.OrdinalIgnoreCase)
        };
        db.TravelCatalogItems.Add(item);
        await db.SaveChangesAsync(ct);
        return Created($"/api/catalog/{item.Id}", item);
    }

    [AllowAnonymous, HttpPut("{id:guid}")]
    public async Task<IActionResult> Put(Guid id, UpdateCatalogItemRequest request, CancellationToken ct)
    {
        try
        {
            var updated = await service.UpdateCatalogItemAsync(id, request, ct);
            return updated is not null ? Ok(updated) : NotFound();
        }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [AllowAnonymous, HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await service.DeleteCatalogItemAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }

    [AllowAnonymous, HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var item = await db.TravelCatalogItems.FindAsync([id], ct);
        if (item is null) return NotFound();
        item.IsApproved = true;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(item);
    }

    [AllowAnonymous, HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        var item = await db.TravelCatalogItems.FindAsync([id], ct);
        if (item is null) return NotFound();
        item.IsApproved = false;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Ok(item);
    }
}
