using Microsoft.AspNetCore.Mvc;
using TravelWise.Api.Contracts;
using TravelWise.Api.Services;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/groups")]
public sealed class GroupController(TravelWiseService service) : ControllerBase
{
    [HttpGet("{tripId:guid}/members")]
    public async Task<IActionResult> GetMembers(Guid tripId, CancellationToken ct) => Ok(await service.GetMembersAsync(tripId, ct));

    [HttpPost("members")]
    public async Task<IActionResult> AddMember(CreateMemberRequest request, CancellationToken ct)
    {
        try { return Created("", await service.AddMemberAsync(request, ct)); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpPut("members/{id:guid}")]
    public async Task<IActionResult> UpdateMember(Guid id, UpdateMemberRequest request, CancellationToken ct)
    {
        try
        {
            var updated = await service.UpdateMemberAsync(id, request, ct);
            return updated is not null ? Ok(updated) : NotFound();
        }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }

    [HttpDelete("members/{id:guid}")]
    public async Task<IActionResult> DeleteMember(Guid id, CancellationToken ct)
    {
        var deleted = await service.DeleteMemberAsync(id, ct);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("expenses")]
    public async Task<IActionResult> AddExpense(CreateSharedExpenseSplitRequest request, CancellationToken ct)
    {
        try { return Created("", await service.AddSharedExpenseAsync(request, ct)); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
    }
}
