using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/weather")]
public sealed class WeatherController(IHttpClientFactory clients) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(string destination, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(destination)) return BadRequest(new { error = "Destination is required." });
        try
        {
            var client = clients.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);
            var location = await client.GetFromJsonAsync<JsonElement>(
                $"https://geocoding-api.open-meteo.com/v1/search?name={Uri.EscapeDataString(destination)}&count=1&language=en&format=json", ct);
            if (!location.TryGetProperty("results", out var results) || results.GetArrayLength() == 0)
                return NotFound(new { error = "Destination was not found." });
            var first = results[0];
            var latitude = first.GetProperty("latitude").GetDouble();
            var longitude = first.GetProperty("longitude").GetDouble();
            var forecast = await client.GetFromJsonAsync<JsonElement>(
                $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,precipitation,wind_speed_10m&timezone=auto", ct);
            return Ok(new { provider = "Open-Meteo", destination, latitude, longitude, forecast });
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            return StatusCode(504, new { error = "Weather provider timed out." });
        }
        catch (HttpRequestException)
        {
            return StatusCode(503, new { error = "Weather provider is temporarily unavailable." });
        }
        catch (JsonException)
        {
            return StatusCode(502, new { error = "Weather provider returned an invalid response." });
        }
    }
}
