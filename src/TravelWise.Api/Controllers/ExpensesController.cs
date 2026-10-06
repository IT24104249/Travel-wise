using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Contracts;
using TravelWise.Api.Data;
using TravelWise.Api.Services;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/expenses")]
public sealed class ExpensesController(TravelWiseService service, TravelWiseDbContext db) : ControllerBase
{
    [HttpGet("trip/{tripId:guid}")]
    public async Task<IActionResult> GetByTrip(Guid tripId, CancellationToken ct) => Ok(await service.GetExpensesAsync(tripId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct) =>
        await db.SharedExpenses.FirstOrDefaultAsync(x => x.Id == id, ct) is { } exp ? Ok(exp) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Post(CreateSharedExpenseRequest request, CancellationToken ct)
    {
        try { return Created("", await service.AddExpenseAsync(request, ct)); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Put(Guid id, UpdateSharedExpenseRequest request, CancellationToken ct)
    {
        try
        {
            var updated = await service.UpdateExpenseAsync(id, request, ct);
            return updated is not null ? Ok(updated) : NotFound();
        }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await service.DeleteExpenseAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}
