using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TravelWise.Api.Contracts;
using TravelWise.Api.Data;
using TravelWise.Api.Models;

namespace TravelWise.Api.Services;

public sealed class TravelWiseService(TravelWiseDbContext db)
{
    public async Task<Trip> CreateTripAsync(CreateTripRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Destination))
            throw new ArgumentException("Trip name and destination are required.");
        if (request.EndDate < request.StartDate) throw new ArgumentException("End date must be after start date.");
        var trip = new Trip { Name = request.Name.Trim(), Destination = request.Destination.Trim(), StartDate = request.StartDate, EndDate = request.EndDate };
        db.Trips.Add(trip);
        await db.SaveChangesAsync(ct);
        return trip;
    }

    public Task<List<Trip>> GetTripsAsync(CancellationToken ct) => db.Trips.OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public async Task<SharedExpense> AddExpenseAsync(CreateSharedExpenseRequest request, CancellationToken ct)
    {
        if (request.Amount <= 0) throw new ArgumentException("Expense amount must be greater than zero (BR-BUD-01).");
        if (!await db.Trips.AnyAsync(x => x.Id == request.TripId, ct)) throw new KeyNotFoundException("Trip not found.");
        var expense = new SharedExpense { TripId = request.TripId, PaidBy = request.PaidBy.Trim(), Amount = request.Amount, Currency = request.Currency.Trim().ToUpperInvariant(), Description = request.Description.Trim() };
        db.SharedExpenses.Add(expense);
        await db.SaveChangesAsync(ct);
        return expense;
    }

    public Task<List<SharedExpense>> GetExpensesAsync(Guid tripId, CancellationToken ct) =>
        db.SharedExpenses.Where(x => x.TripId == tripId).OrderByDescending(x => x.CreatedAt).ToListAsync(ct);

    public async Task<Activity> AddActivityAsync(CreateActivityRequest request, CancellationToken ct)
    {
        if (request.EndAt <= request.StartAt) throw new ArgumentException("Activity end must be after its start.");
        var overlaps = await db.Activities.AnyAsync(x => x.TripId == request.TripId && request.StartAt < x.EndAt && request.EndAt > x.StartAt, ct);
        if (overlaps) throw new ArgumentException("Activity overlaps an existing itinerary activity (BR-ACT-01).");
        var activity = new Activity { TripId = request.TripId, Name = request.Name.Trim(), Location = request.Location.Trim(), StartAt = request.StartAt.ToUniversalTime(), EndAt = request.EndAt.ToUniversalTime() };
        db.Activities.Add(activity);
        await db.SaveChangesAsync(ct);
        return activity;
    }

    public Task<List<Activity>> GetActivitiesAsync(Guid tripId, CancellationToken ct) =>
        db.Activities.Where(x => x.TripId == tripId).OrderBy(x => x.StartAt).ToListAsync(ct);

    public async Task<RiskAssessment> AddRiskAsync(CreateRiskRequest request, CancellationToken ct)
    {
        if (!Enum.TryParse<RiskSeverity>(request.Severity, true, out var severity))
            throw new ArgumentException("Risk severity must be Low, Medium, High or Critical (BR-RISK-01).");
        var assessment = new RiskAssessment { TripId = request.TripId, Severity = severity, Summary = request.Summary.Trim(), WeatherSummary = request.WeatherSummary?.Trim() };
        db.RiskAssessments.Add(assessment);
        await db.SaveChangesAsync(ct);
        return assessment;
    }

    public Task<List<RiskAssessment>> GetRisksAsync(Guid tripId, CancellationToken ct) =>
        db.RiskAssessments.Where(x => x.TripId == tripId).OrderByDescending(x => x.AssessedAt).ToListAsync(ct);

    public async Task<GroupMember> AddMemberAsync(CreateMemberRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName) || string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Member name and email are required.");
        var member = new GroupMember { TripId = request.TripId, DisplayName = request.DisplayName.Trim(), Email = request.Email.Trim().ToLowerInvariant() };
        db.GroupMembers.Add(member);
        await db.SaveChangesAsync(ct);
        return member;
    }

    public Task<List<GroupMember>> GetMembersAsync(Guid tripId, CancellationToken ct) =>
        db.GroupMembers.Where(x => x.TripId == tripId && x.IsActive).OrderBy(x => x.DisplayName).ToListAsync(ct);

    public async Task<SharedExpense> AddSharedExpenseAsync(CreateSharedExpenseSplitRequest request, CancellationToken ct)
    {
        if (request.Amount <= 0) throw new ArgumentException("Shared expense must be greater than zero.");
        if (request.Splits.Count == 0 || request.Splits.Sum(x => x.Amount) != request.Amount)
            throw new ArgumentException("Split amounts must exactly equal the expense amount (BR-SPLIT-01).");
        var memberIds = await db.GroupMembers.Where(x => x.TripId == request.TripId && x.IsActive).Select(x => x.Id).ToListAsync(ct);
        if (request.Splits.Any(x => !memberIds.Contains(x.GroupMemberId)))
            throw new ArgumentException("All split participants must be active group members (BR-SPLIT-03).");
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var expense = new SharedExpense { TripId = request.TripId, PaidBy = request.PaidBy.Trim(), Amount = request.Amount, Currency = request.Currency.Trim().ToUpperInvariant(), Description = request.Description.Trim() };
        db.SharedExpenses.Add(expense);
        await db.SaveChangesAsync(ct);
        db.ExpenseSplits.AddRange(request.Splits.Select(x => new ExpenseSplit { SharedExpenseId = expense.Id, GroupMemberId = x.GroupMemberId, Amount = x.Amount }));
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return expense;
    }

    public async Task<Workflow> StartWorkflowAsync(StartWorkflowRequest request, CancellationToken ct)
    {
        if (!await db.Trips.AnyAsync(x => x.Id == request.TripId, ct)) throw new KeyNotFoundException("Trip not found.");
        var workflow = new Workflow { TripId = request.TripId, Objective = request.Objective.Trim(), Status = WorkflowStatus.Created };
        db.Workflows.Add(workflow);
        db.AuditLogs.Add(new AuditLog { WorkflowId = workflow.Id, EventType = "WORKFLOW_CREATED", Details = workflow.Objective });
        await db.SaveChangesAsync(ct);
        return workflow;
    }

    public Task<Workflow?> GetWorkflowAsync(Guid id, CancellationToken ct) => db.Workflows.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<Workflow?> ApproveWorkflowAsync(Guid id, ApprovalRequest request, CancellationToken ct)
    {
        var workflow = await db.Workflows.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (workflow is null) return null;
        workflow.Status = request.Approved ? WorkflowStatus.Approved : WorkflowStatus.Rejected;
        workflow.UpdatedAt = DateTime.UtcNow;
        db.AuditLogs.Add(new AuditLog { WorkflowId = id, EventType = request.Approved ? "APPROVED" : "REJECTED", Details = request.Comment ?? string.Empty });
        await db.SaveChangesAsync(ct);
        return workflow;
    }

    public async Task ApplyAiResultAsync(Guid id, JsonDocument? result, CancellationToken ct)
    {
        if (result is null) return;
        var workflow = await db.Workflows.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (workflow is null) return;
        var root = result.RootElement;
        var stateText = root.GetProperty("state").GetString() ?? string.Empty;
        var normalizedState = stateText.Replace("_", string.Empty);
        workflow.Status = Enum.TryParse<WorkflowStatus>(normalizedState, true, out var state)
            ? state : WorkflowStatus.AgentFailed;
        workflow.PlanJson = root.GetProperty("plan").GetRawText();
        workflow.ResultJson = root.GetProperty("agents").GetRawText();
        workflow.UpdatedAt = DateTime.UtcNow;
        db.AuditLogs.Add(new AuditLog { WorkflowId = id, EventType = "AI_RESULT_RECEIVED", Details = root.GetProperty("validation").GetRawText() });
        if (root.TryGetProperty("agents", out var agents))
        {
            foreach (var agent in agents.EnumerateArray())
            {
                db.WorkflowExecutions.Add(new WorkflowExecution
                {
                    WorkflowId = id,
                    AgentName = agent.GetProperty("agent").GetString() ?? "Unknown",
                    EventType = "AGENT_COMPLETED",
                    DetailsJson = agent.GetRawText()
                });
            }
        }
        await db.SaveChangesAsync(ct);
    }

    public Task<Trip?> GetTripByIdAsync(Guid id, CancellationToken ct) =>
        db.Trips.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<Trip?> UpdateTripAsync(Guid id, UpdateTripRequest request, CancellationToken ct)
    {
        var trip = await db.Trips.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (trip is null) return null;
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Destination))
            throw new ArgumentException("Trip name and destination are required.");
        if (request.EndDate < request.StartDate) throw new ArgumentException("End date must be after start date.");

        trip.Name = request.Name.Trim();
        trip.Destination = request.Destination.Trim();
        trip.StartDate = request.StartDate;
        trip.EndDate = request.EndDate;
        await db.SaveChangesAsync(ct);
        return trip;
    }

    public async Task<bool> DeleteTripAsync(Guid id, CancellationToken ct)
    {
        var trip = await db.Trips.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (trip is null) return false;
        db.Trips.Remove(trip);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<Budget?> UpdateBudgetAsync(Guid id, UpdateBudgetRequest request, CancellationToken ct)
    {
        var budget = await db.Budgets.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (budget is null) return null;
        if (request.Amount <= 0) throw new ArgumentException("Budget amount must be greater than zero.");
        budget.Amount = request.Amount;
        budget.Currency = request.Currency.Trim().ToUpperInvariant();
        await db.SaveChangesAsync(ct);
        return budget;
    }

    public async Task<bool> DeleteBudgetAsync(Guid id, CancellationToken ct)
    {
        var budget = await db.Budgets.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (budget is null) return false;
        db.Budgets.Remove(budget);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<SharedExpense?> UpdateExpenseAsync(Guid id, UpdateSharedExpenseRequest request, CancellationToken ct)
    {
        var expense = await db.SharedExpenses.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (expense is null) return null;
        if (request.Amount <= 0) throw new ArgumentException("Expense amount must be greater than zero (BR-BUD-01).");
        expense.PaidBy = request.PaidBy.Trim();
        expense.Amount = request.Amount;
        expense.Currency = request.Currency.Trim().ToUpperInvariant();
        expense.Description = request.Description.Trim();
        await db.SaveChangesAsync(ct);
        return expense;
    }

    public async Task<bool> DeleteExpenseAsync(Guid id, CancellationToken ct)
    {
        var expense = await db.SharedExpenses.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (expense is null) return false;
        db.SharedExpenses.Remove(expense);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<Activity?> UpdateActivityAsync(Guid id, UpdateActivityRequest request, CancellationToken ct)
    {
        var activity = await db.Activities.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (activity is null) return null;
        if (request.EndAt <= request.StartAt) throw new ArgumentException("Activity end must be after its start.");
        var overlaps = await db.Activities.AnyAsync(x => x.Id != id && x.TripId == activity.TripId && request.StartAt < x.EndAt && request.EndAt > x.StartAt, ct);
        if (overlaps) throw new ArgumentException("Activity overlaps an existing itinerary activity (BR-ACT-01).");
        activity.Name = request.Name.Trim();
        activity.Location = request.Location.Trim();
        activity.StartAt = request.StartAt.ToUniversalTime();
        activity.EndAt = request.EndAt.ToUniversalTime();
        await db.SaveChangesAsync(ct);
        return activity;
    }

    public async Task<bool> DeleteActivityAsync(Guid id, CancellationToken ct)
    {
        var activity = await db.Activities.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (activity is null) return false;
        db.Activities.Remove(activity);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<RiskAssessment?> UpdateRiskAsync(Guid id, UpdateRiskRequest request, CancellationToken ct)
    {
        var risk = await db.RiskAssessments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (risk is null) return null;
        if (!Enum.TryParse<RiskSeverity>(request.Severity, true, out var severity))
            throw new ArgumentException("Risk severity must be Low, Medium, High or Critical (BR-RISK-01).");
        risk.Severity = severity;
        risk.Summary = request.Summary.Trim();
        risk.WeatherSummary = request.WeatherSummary?.Trim();
        await db.SaveChangesAsync(ct);
        return risk;
    }

    public async Task<bool> DeleteRiskAsync(Guid id, CancellationToken ct)
    {
        var risk = await db.RiskAssessments.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (risk is null) return false;
        db.RiskAssessments.Remove(risk);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<GroupMember?> UpdateMemberAsync(Guid id, UpdateMemberRequest request, CancellationToken ct)
    {
        var member = await db.GroupMembers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (member is null) return null;
        if (string.IsNullOrWhiteSpace(request.DisplayName) || string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Member name and email are required.");
        member.DisplayName = request.DisplayName.Trim();
        member.Email = request.Email.Trim().ToLowerInvariant();
        member.IsActive = request.IsActive;
        await db.SaveChangesAsync(ct);
        return member;
    }

    public async Task<bool> DeleteMemberAsync(Guid id, CancellationToken ct)
    {
        var member = await db.GroupMembers.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (member is null) return false;
        db.GroupMembers.Remove(member);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public Task<TravelCatalogItem?> GetCatalogItemAsync(Guid id, CancellationToken ct) =>
        db.TravelCatalogItems.FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<TravelCatalogItem?> UpdateCatalogItemAsync(Guid id, UpdateCatalogItemRequest request, CancellationToken ct)
    {
        var item = await db.TravelCatalogItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (item is null) return null;
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Destination))
            throw new ArgumentException("Name and destination are required.");
        if (request.Price is < 0 || request.Rating is < 0 or > 5)
            throw new ArgumentException("Price cannot be negative and rating must be between 0 and 5.");

        item.Type = request.Type;
        item.Name = request.Name.Trim();
        item.Destination = request.Destination.Trim();
        item.Description = request.Description.Trim();
        item.Address = request.Address?.Trim();
        item.Contact = request.Contact?.Trim();
        item.Price = request.Price;
        item.Currency = request.Currency.Trim().ToUpperInvariant();
        item.CuisineOrCategory = request.CuisineOrCategory?.Trim();
        item.Rating = request.Rating;
        if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return item;
    }

    public async Task<bool> DeleteCatalogItemAsync(Guid id, CancellationToken ct)
    {
        var item = await db.TravelCatalogItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (item is null) return false;
        db.TravelCatalogItems.Remove(item);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
