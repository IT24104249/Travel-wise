namespace TravelWise.Api.Models;

public sealed class Trip
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class Budget
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "LKR";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class SharedExpense
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public string PaidBy { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "LKR";
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum WorkflowStatus
{
    Created, Planning, Delegating, AgentsRunning, Validating,
    AwaitingApproval, Approved, Completed, Rejected, ValidationFailed, AgentFailed
}

public sealed class Workflow
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public string Objective { get; set; } = string.Empty;
    public WorkflowStatus Status { get; set; } = WorkflowStatus.Created;
    public string? PlanJson { get; set; }
    public string? ResultJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkflowId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class Activity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum RiskSeverity { Low, Medium, High, Critical }

public sealed class RiskAssessment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public RiskSeverity Severity { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? WeatherSummary { get; set; }
    public DateTime AssessedAt { get; set; } = DateTime.UtcNow;
}

public sealed class GroupMember
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}

public sealed class ExpenseSplit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SharedExpenseId { get; set; }
    public Guid GroupMemberId { get; set; }
    public decimal Amount { get; set; }
}

public sealed class SettlementRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public string FromMember { get; set; } = string.Empty;
    public string ToMember { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "LKR";
    public bool IsSettled { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class WorkflowExecution
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WorkflowId { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string DetailsJson { get; set; } = "{}";
    public long DurationMs { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum CatalogItemType { VisitingPlace, Restaurant, Accommodation, FoodPrice }

public sealed class TravelCatalogItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public CatalogItemType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Contact { get; set; }
    public decimal? Price { get; set; }
    public string Currency { get; set; } = "LKR";
    public string? CuisineOrCategory { get; set; }
    public decimal? Rating { get; set; }
    public string ProviderUserId { get; set; } = string.Empty;
    public bool IsApproved { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public enum ProviderApprovalStatus { Pending, Approved, Rejected }

public sealed class ProviderRegistration
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string BusinessName { get; set; } = string.Empty;
    public string? ContactPhone { get; set; }
    public string? ServiceType { get; set; }
    public ProviderApprovalStatus Status { get; set; } = ProviderApprovalStatus.Pending;
    public string? AdminNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

