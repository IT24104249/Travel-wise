using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Data;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/auditlogs")]
public sealed class AuditLogsController(TravelWiseDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int limit = 50, CancellationToken ct = default) =>
        Ok(await db.AuditLogs.AsNoTracking().OrderByDescending(x => x.CreatedAt).Take(limit).ToListAsync(ct));
}
