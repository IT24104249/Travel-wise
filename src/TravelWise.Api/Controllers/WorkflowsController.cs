using Microsoft.AspNetCore.Mvc;
using TravelWise.Api.Contracts;
using TravelWise.Api.Data;
using TravelWise.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/workflows")]
public sealed class WorkflowsController(TravelWiseService service, AiWorkflowClient ai, TravelWiseDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Start(StartWorkflowRequest request, CancellationToken ct)
    {
        try
        {
            var workflow = await service.StartWorkflowAsync(request, ct);
            var trip = await db.Trips.AsNoTracking().SingleOrDefaultAsync(item => item.Id == workflow.TripId, ct);
            
            var dest = trip?.Destination?.Trim().ToLower() ?? "";
            var query = db.TravelCatalogItems.AsNoTracking().Where(item => item.IsActive && item.IsApproved);
            
            if (!string.IsNullOrWhiteSpace(dest))
            {
                // Match case-insensitively or matching substring
                var matchedQuery = query.Where(item => item.Destination.ToLower().Contains(dest) || dest.Contains(item.Destination.ToLower()));
                if (await matchedQuery.AnyAsync(ct))
                {
                    query = matchedQuery;
                }
            }

            var catalogItems = await query
                .OrderByDescending(item => item.Rating)
                .Take(50)
                .Select(item => new
                {
                    id = item.Id,
                    type = item.Type.ToString(),
                    name = item.Name,
                    destination = item.Destination,
                    description = item.Description,
                    address = item.Address,
                    contact = item.Contact,
                    price = item.Price,
                    currency = item.Currency,
                    category = item.CuisineOrCategory,
                    rating = item.Rating
                })
                .Cast<object>()
                .ToArrayAsync(ct);

            var aiResult = await ai.StartAsync(workflow.Id, workflow.Objective, trip?.Destination ?? string.Empty, catalogItems, ct);
            await service.ApplyAiResultAsync(workflow.Id, aiResult, ct);
            workflow = await service.GetWorkflowAsync(workflow.Id, ct) ?? workflow;
            return Accepted($"/api/workflows/{workflow.Id}", workflow);
        }
        catch (KeyNotFoundException e) { return NotFound(new { error = e.Message }); }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) =>
        (await service.GetWorkflowAsync(id, ct)) is { } workflow ? Ok(workflow) : NotFound();

    [HttpPost("{id:guid}/approval")]
    public async Task<IActionResult> Approve(Guid id, ApprovalRequest request, CancellationToken ct) =>
        (await service.ApproveWorkflowAsync(id, request, ct)) is { } workflow ? Ok(workflow) : NotFound();
}
