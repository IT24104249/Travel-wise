namespace TravelWise.Api.Contracts;

public sealed record AuthCredentials(string Email, string Password);

public sealed record RegisterRequest(
    string Email,
    string Password,
    string Role = "User",
    string? DisplayName = null,
    string? ContactPhone = null,
    string? ServiceType = null);

public sealed record ProviderApprovalActionRequest(string? Note = null);

public sealed record AuthSession(
    string AccessToken,
    string? RefreshToken,
    int? ExpiresIn,
    string? TokenType,
    object? User);
