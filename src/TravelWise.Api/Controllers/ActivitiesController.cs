using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Contracts;
using TravelWise.Api.Data;
using TravelWise.Api.Services;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/activities")]
public sealed class ActivitiesController(TravelWiseService service, TravelWiseDbContext db) : ControllerBase
{
    [HttpGet("trip/{tripId:guid}")]
    public async Task<IActionResult> GetByTrip(Guid tripId, CancellationToken ct) => Ok(await service.GetActivitiesAsync(tripId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct) =>
        await db.Activities.FirstOrDefaultAsync(x => x.Id == id, ct) is { } act ? Ok(act) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Post(CreateActivityRequest request, CancellationToken ct)
    {
        try { return Created("", await service.AddActivityAsync(request, ct)); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Put(Guid id, UpdateActivityRequest request, CancellationToken ct)
    {
        try
        {
            var updated = await service.UpdateActivityAsync(id, request, ct);
            return updated is not null ? Ok(updated) : NotFound();
        }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await service.DeleteActivityAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}
