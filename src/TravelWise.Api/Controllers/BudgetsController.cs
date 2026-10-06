using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Contracts;
using TravelWise.Api.Data;
using TravelWise.Api.Models;
using TravelWise.Api.Services;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/budgets")]
public sealed class BudgetsController(TravelWiseDbContext db, TravelWiseService service) : ControllerBase
{
    [HttpGet("trip/{tripId:guid}")]
    public async Task<IActionResult> GetByTrip(Guid tripId, CancellationToken ct) =>
        Ok(await db.Budgets.Where(x => x.TripId == tripId).OrderByDescending(x => x.CreatedAt).ToListAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct) =>
        await db.Budgets.FirstOrDefaultAsync(x => x.Id == id, ct) is { } budget ? Ok(budget) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Post(Budget budget, CancellationToken ct)
    {
        if (budget.Amount <= 0) return BadRequest(new { error = "Budget amount must be greater than zero." });
        budget.Id = Guid.NewGuid();
        budget.CreatedAt = DateTime.UtcNow;
        db.Budgets.Add(budget);
        await db.SaveChangesAsync(ct);
        return Created("", budget);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Put(Guid id, UpdateBudgetRequest request, CancellationToken ct)
    {
        try
        {
            var updated = await service.UpdateBudgetAsync(id, request, ct);
            return updated is not null ? Ok(updated) : NotFound();
        }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await service.DeleteBudgetAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}
