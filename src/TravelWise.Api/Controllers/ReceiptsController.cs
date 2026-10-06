using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TravelWise.Api.Controllers;

[ApiController, Authorize, Route("api/receipts")]
public sealed class ReceiptsController(IHttpClientFactory clients, IConfiguration configuration) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "A receipt image is required." });
        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Only image receipts are accepted." });

        var supabaseUrl = configuration["Supabase:Url"];
        var anonKey = configuration["Supabase:AnonKey"];
        var token = Request.Headers.Authorization.ToString().Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(supabaseUrl) || string.IsNullOrWhiteSpace(anonKey) || string.IsNullOrWhiteSpace(token))
            return Problem("Supabase Storage is not configured for the API.", statusCode: StatusCodes.Status503ServiceUnavailable);

        var objectPath = $"receipts/{Guid.NewGuid():N}{Path.GetExtension(file.FileName)}";
        using var content = new StreamContent(file.OpenReadStream());
        content.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{supabaseUrl.TrimEnd('/')}/storage/v1/object/{objectPath}")
        {
            Content = content
        };
        request.Headers.Add("apikey", anonKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("x-upsert", "false");

        var response = await clients.CreateClient().SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var status = response.StatusCode == HttpStatusCode.Unauthorized ? StatusCodes.Status401Unauthorized : StatusCodes.Status502BadGateway;
            return StatusCode(status, new { error = "Receipt storage upload failed." });
        }
        return Ok(new { bucket = "receipts", path = objectPath });
    }
}
