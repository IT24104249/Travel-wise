using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Data;
using TravelWise.Api.Models;

namespace TravelWise.Api.Controllers;

[ApiController, Route("api/settlements")]
public sealed class SettlementsController(TravelWiseDbContext db) : ControllerBase
{
    [HttpGet("trip/{tripId:guid}")]
    public async Task<IActionResult> Get(Guid tripId, CancellationToken ct)
    {
        var members = await db.GroupMembers.Where(x => x.TripId == tripId && x.IsActive).ToListAsync(ct);
        var balances = members.ToDictionary(x => x.DisplayName, _ => 0m, StringComparer.OrdinalIgnoreCase);
        var expenses = await db.SharedExpenses.Where(x => x.TripId == tripId).ToListAsync(ct);
        var splits = await db.ExpenseSplits.Where(x => expenses.Select(e => e.Id).Contains(x.SharedExpenseId)).ToListAsync(ct);
        foreach (var expense in expenses)
        {
            if (!balances.ContainsKey(expense.PaidBy)) continue;
            balances[expense.PaidBy] += expense.Amount;
            foreach (var split in splits.Where(x => x.SharedExpenseId == expense.Id))
            {
                var member = members.FirstOrDefault(x => x.Id == split.GroupMemberId);
                if (member is not null) balances[member.DisplayName] -= split.Amount;
            }
        }

        var creditors = balances.Where(x => x.Value > 0.005m).Select(x => new Balance(x.Key, x.Value)).ToList();
        var debtors = balances.Where(x => x.Value < -0.005m).Select(x => new Balance(x.Key, -x.Value)).ToList();
        var transfers = new List<SettlementRecord>();
        var i = 0;
        var j = 0;
        while (i < debtors.Count && j < creditors.Count)
        {
            var amount = Math.Min(debtors[i].Amount, creditors[j].Amount);
            transfers.Add(new SettlementRecord { TripId = tripId, FromMember = debtors[i].Name, ToMember = creditors[j].Name, Amount = decimal.Round(amount, 2), Currency = expenses.FirstOrDefault()?.Currency ?? "LKR" });
            debtors[i] = debtors[i] with { Amount = debtors[i].Amount - amount };
            creditors[j] = creditors[j] with { Amount = creditors[j].Amount - amount };
            if (debtors[i].Amount <= 0.005m) i++;
            if (creditors[j].Amount <= 0.005m) j++;
        }
        return Ok(new { balances, transfers, transactionCount = transfers.Count, netBalanceSum = balances.Values.Sum() });
    }

    private sealed record Balance(string Name, decimal Amount);
}
