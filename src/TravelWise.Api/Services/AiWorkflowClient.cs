using System.Net.Http.Json;
using System.Text.Json;

namespace TravelWise.Api.Services;

public sealed class AiWorkflowClient(HttpClient http, IConfiguration configuration)
{
    public async Task<JsonDocument?> StartAsync(Guid workflowId, string objective, string destination, object[] catalogItems, CancellationToken ct)
    {
        var baseUrl = configuration["AI_SERVICE_URL"];
        if (string.IsNullOrWhiteSpace(baseUrl)) return null;
        http.BaseAddress = new Uri(baseUrl);
        var response = await http.PostAsJsonAsync("/internal/workflows", new
        {
            workflow_id = workflowId,
            objective,
            destination,
            catalog_items = catalogItems
        }, ct);
        if (!response.IsSuccessStatusCode) return null;
        return await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: ct);
    }
}
