using Microsoft.EntityFrameworkCore;
using TravelWise.Api.Models;

namespace TravelWise.Api.Data;

public sealed class TravelWiseDbContext(DbContextOptions<TravelWiseDbContext> options) : DbContext(options)
{
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<SharedExpense> SharedExpenses => Set<SharedExpense>();
    public DbSet<Workflow> Workflows => Set<Workflow>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<RiskAssessment> RiskAssessments => Set<RiskAssessment>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();
    public DbSet<ExpenseSplit> ExpenseSplits => Set<ExpenseSplit>();
    public DbSet<SettlementRecord> SettlementRecords => Set<SettlementRecord>();
    public DbSet<WorkflowExecution> WorkflowExecutions => Set<WorkflowExecution>();
    public DbSet<TravelCatalogItem> TravelCatalogItems => Set<TravelCatalogItem>();
    public DbSet<ProviderRegistration> ProviderRegistrations => Set<ProviderRegistration>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProviderRegistration>().Property(x => x.Status).HasConversion<string>();
        modelBuilder.Entity<ProviderRegistration>().HasIndex(x => x.Email);
        modelBuilder.Entity<Trip>().Property(x => x.Name).HasMaxLength(160).IsRequired();
        modelBuilder.Entity<Budget>().Property(x => x.Amount).HasPrecision(18, 2);
        modelBuilder.Entity<SharedExpense>().Property(x => x.Amount).HasPrecision(18, 2);
        modelBuilder.Entity<SharedExpense>().HasIndex(x => x.TripId);
        modelBuilder.Entity<Workflow>().HasIndex(x => x.Status);
        modelBuilder.Entity<Workflow>().Property(x => x.Status).HasConversion<string>();
        modelBuilder.Entity<Activity>().HasIndex(x => new { x.TripId, x.StartAt, x.EndAt });
        modelBuilder.Entity<RiskAssessment>().Property(x => x.Severity).HasConversion<string>();
        modelBuilder.Entity<ExpenseSplit>().Property(x => x.Amount).HasPrecision(18, 2);
        modelBuilder.Entity<SettlementRecord>().Property(x => x.Amount).HasPrecision(18, 2);
        modelBuilder.Entity<WorkflowExecution>().HasIndex(x => x.WorkflowId);
        modelBuilder.Entity<TravelCatalogItem>().Property(x => x.Type).HasConversion<string>();
        modelBuilder.Entity<TravelCatalogItem>().Property(x => x.Price).HasPrecision(18, 2);
        modelBuilder.Entity<TravelCatalogItem>().Property(x => x.Rating).HasPrecision(3, 2);
        modelBuilder.Entity<TravelCatalogItem>().HasIndex(x => new { x.Destination, x.Type, x.IsApproved, x.IsActive });
        modelBuilder.Entity<Budget>().HasOne<Trip>().WithMany().HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<SharedExpense>().HasOne<Trip>().WithMany().HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Activity>().HasOne<Trip>().WithMany().HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<RiskAssessment>().HasOne<Trip>().WithMany().HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<GroupMember>().HasOne<Trip>().WithMany().HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Workflow>().HasOne<Trip>().WithMany().HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<AuditLog>().HasOne<Workflow>().WithMany().HasForeignKey(x => x.WorkflowId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<WorkflowExecution>().HasOne<Workflow>().WithMany().HasForeignKey(x => x.WorkflowId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ExpenseSplit>().HasOne<SharedExpense>().WithMany().HasForeignKey(x => x.SharedExpenseId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ExpenseSplit>().HasOne<GroupMember>().WithMany().HasForeignKey(x => x.GroupMemberId).OnDelete(DeleteBehavior.Restrict);
    }
}
