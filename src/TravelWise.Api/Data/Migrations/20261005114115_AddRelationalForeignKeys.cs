using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelWise.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRelationalForeignKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Workflows_TripId",
                table: "Workflows",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_RiskAssessments_TripId",
                table: "RiskAssessments",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupMembers_TripId",
                table: "GroupMembers",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseSplits_GroupMemberId",
                table: "ExpenseSplits",
                column: "GroupMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseSplits_SharedExpenseId",
                table: "ExpenseSplits",
                column: "SharedExpenseId");

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_TripId",
                table: "Budgets",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_WorkflowId",
                table: "AuditLogs",
                column: "WorkflowId");

            migrationBuilder.AddForeignKey(
                name: "FK_Activities_Trips_TripId",
                table: "Activities",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AuditLogs_Workflows_WorkflowId",
                table: "AuditLogs",
                column: "WorkflowId",
                principalTable: "Workflows",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Budgets_Trips_TripId",
                table: "Budgets",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseSplits_GroupMembers_GroupMemberId",
                table: "ExpenseSplits",
                column: "GroupMemberId",
                principalTable: "GroupMembers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ExpenseSplits_SharedExpenses_SharedExpenseId",
                table: "ExpenseSplits",
                column: "SharedExpenseId",
                principalTable: "SharedExpenses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GroupMembers_Trips_TripId",
                table: "GroupMembers",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_RiskAssessments_Trips_TripId",
                table: "RiskAssessments",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SharedExpenses_Trips_TripId",
                table: "SharedExpenses",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkflowExecutions_Workflows_WorkflowId",
                table: "WorkflowExecutions",
                column: "WorkflowId",
                principalTable: "Workflows",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Workflows_Trips_TripId",
                table: "Workflows",
                column: "TripId",
                principalTable: "Trips",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Activities_Trips_TripId",
                table: "Activities");

            migrationBuilder.DropForeignKey(
                name: "FK_AuditLogs_Workflows_WorkflowId",
                table: "AuditLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_Budgets_Trips_TripId",
                table: "Budgets");

            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseSplits_GroupMembers_GroupMemberId",
                table: "ExpenseSplits");

            migrationBuilder.DropForeignKey(
                name: "FK_ExpenseSplits_SharedExpenses_SharedExpenseId",
                table: "ExpenseSplits");

            migrationBuilder.DropForeignKey(
                name: "FK_GroupMembers_Trips_TripId",
                table: "GroupMembers");

            migrationBuilder.DropForeignKey(
                name: "FK_RiskAssessments_Trips_TripId",
                table: "RiskAssessments");

            migrationBuilder.DropForeignKey(
                name: "FK_SharedExpenses_Trips_TripId",
                table: "SharedExpenses");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkflowExecutions_Workflows_WorkflowId",
                table: "WorkflowExecutions");

            migrationBuilder.DropForeignKey(
                name: "FK_Workflows_Trips_TripId",
                table: "Workflows");

            migrationBuilder.DropIndex(
                name: "IX_Workflows_TripId",
                table: "Workflows");

            migrationBuilder.DropIndex(
                name: "IX_RiskAssessments_TripId",
                table: "RiskAssessments");

            migrationBuilder.DropIndex(
                name: "IX_GroupMembers_TripId",
                table: "GroupMembers");

            migrationBuilder.DropIndex(
                name: "IX_ExpenseSplits_GroupMemberId",
                table: "ExpenseSplits");

            migrationBuilder.DropIndex(
                name: "IX_ExpenseSplits_SharedExpenseId",
                table: "ExpenseSplits");

            migrationBuilder.DropIndex(
                name: "IX_Budgets_TripId",
                table: "Budgets");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_WorkflowId",
                table: "AuditLogs");
        }
    }
}
