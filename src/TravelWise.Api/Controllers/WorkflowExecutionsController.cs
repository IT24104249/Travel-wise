using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Data;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/workflows")]
public sealed class WorkflowExecutionsController(TravelWiseDbContext db) : ControllerBase
{
    [HttpGet("{workflowId:guid}/executions")]
    public async Task<IActionResult> Get(Guid workflowId, CancellationToken ct) =>
        Ok(await db.WorkflowExecutions.Where(x => x.WorkflowId == workflowId).OrderBy(x => x.CreatedAt).ToListAsync(ct));

    [HttpGet("{workflowId:guid}/audit")]
    public async Task<IActionResult> Audit(Guid workflowId, CancellationToken ct) =>
        Ok(await db.AuditLogs.Where(x => x.WorkflowId == workflowId).OrderBy(x => x.CreatedAt).ToListAsync(ct));
}
