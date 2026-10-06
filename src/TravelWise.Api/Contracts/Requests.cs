namespace TravelWise.Api.Contracts;

public sealed record CreateTripRequest(string Name, string Destination, DateOnly StartDate, DateOnly EndDate);
public sealed record UpdateTripRequest(string Name, string Destination, DateOnly StartDate, DateOnly EndDate);

public sealed record CreateBudgetRequest(Guid TripId, decimal Amount, string Currency = "LKR");
public sealed record UpdateBudgetRequest(decimal Amount, string Currency = "LKR");

public sealed record CreateSharedExpenseRequest(Guid TripId, string PaidBy, decimal Amount, string Description, string Currency = "LKR");
public sealed record UpdateSharedExpenseRequest(string PaidBy, decimal Amount, string Description, string Currency = "LKR");

public sealed record StartWorkflowRequest(Guid TripId, string Objective);
public sealed record ApprovalRequest(bool Approved, string? Comment);

public sealed record CreateActivityRequest(Guid TripId, string Name, string Location, DateTime StartAt, DateTime EndAt);
public sealed record UpdateActivityRequest(string Name, string Location, DateTime StartAt, DateTime EndAt);

public sealed record CreateRiskRequest(Guid TripId, string Severity, string Summary, string? WeatherSummary);
public sealed record UpdateRiskRequest(string Severity, string Summary, string? WeatherSummary);

public sealed record CreateMemberRequest(Guid TripId, string DisplayName, string Email);
public sealed record UpdateMemberRequest(string DisplayName, string Email, bool IsActive = true);

public sealed record CreateSharedExpenseSplitRequest(Guid TripId, string PaidBy, decimal Amount, string Description, IReadOnlyList<ExpenseSplitRequest> Splits, string Currency = "LKR");
public sealed record ExpenseSplitRequest(Guid GroupMemberId, decimal Amount);
