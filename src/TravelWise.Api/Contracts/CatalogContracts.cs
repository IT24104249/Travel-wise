using TravelWise.Api.Models;

namespace TravelWise.Api.Contracts;

public sealed record CreateCatalogItemRequest(
    CatalogItemType Type,
    string Name,
    string Destination,
    string Description,
    string? Address,
    string? Contact,
    decimal? Price,
    string Currency = "LKR",
    string? CuisineOrCategory = null,
    decimal? Rating = null);

public sealed record UpdateCatalogItemRequest(
    CatalogItemType Type,
    string Name,
    string Destination,
    string Description,
    string? Address,
    string? Contact,
    decimal? Price,
    string Currency = "LKR",
    string? CuisineOrCategory = null,
    decimal? Rating = null,
    bool? IsActive = true);
