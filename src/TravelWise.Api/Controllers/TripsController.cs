using Microsoft.AspNetCore.Mvc;
using TravelWise.Api.Contracts;
using TravelWise.Api.Services;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/trips")]
public sealed class TripsController(TravelWiseService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) => Ok(await service.GetTripsAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct) =>
        await service.GetTripByIdAsync(id, ct) is { } trip ? Ok(trip) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Post(CreateTripRequest request, CancellationToken ct)
    {
        try { return Created("", await service.CreateTripAsync(request, ct)); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Put(Guid id, UpdateTripRequest request, CancellationToken ct)
    {
        try
        {
            var updated = await service.UpdateTripAsync(id, request, ct);
            return updated is not null ? Ok(updated) : NotFound();
        }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var deleted = await service.DeleteTripAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }
}
