# TravelWise AI Features and Functions

## 1. Purpose

TravelWise uses an internal agentic AI service to review a group trip and produce a structured travel proposal. The AI workflow combines:

- Four specialist agents with separate responsibilities.
- Deterministic tools for budget, activity, risk, catalog, and settlement checks.
- An optional Google Gemini coordinator for natural-language planning.
- Schema and business-rule validation before a result is returned.
- Human approval before a recommendation is considered accepted.
- Persistence and audit logging through the ASP.NET Core API.

The AI service is not exposed directly to the web or mobile clients. Both clients call the ASP.NET Core API, and the API calls the internal Python service.

## 2. AI architecture

```text
Web / Flutter client
        |
        | POST /api/workflows
        v
ASP.NET Core API
  - Authenticates the user
  - Creates the workflow record
  - Selects approved catalog data
  - Calls the internal AI service
  - Persists the result and audit events
        |
        | POST /internal/workflows
        v
Python FastAPI AI service
  - Builds the workflow plan
  - Runs four least-privilege agents
  - Optionally calls Gemini
  - Validates the structured output
  - Returns AWAITING_APPROVAL or a safe failure state
        |
        v
Human approval queue
  - Approve or reject recommendation
```

### Main implementation files

| Area | File | Responsibility |
|---|---|---|
| AI orchestrator | [`ai-service/app/main.py`](../ai-service/app/main.py) | FastAPI app, request/response models, tools, agents, orchestration, validation, and workflow endpoints |
| Gemini integration | [`ai-service/app/gemini.py`](../ai-service/app/gemini.py) | Optional structured Google Gemini plan generation |
| AI tests | [`ai-service/tests/test_orchestrator.py`](../ai-service/tests/test_orchestrator.py) | Verifies four-agent orchestration, approval requirement, and objective validation |
| API gateway | [`src/TravelWise.Api/Services/AiWorkflowClient.cs`](../src/TravelWise.Api/Services/AiWorkflowClient.cs) | Sends workflow context from C# to Python |
| Workflow API | [`src/TravelWise.Api/Controllers/WorkflowsController.cs`](../src/TravelWise.Api/Controllers/WorkflowsController.cs) | Starts workflows, reads workflow status, and accepts approval decisions |
| Persistence | [`src/TravelWise.Api/Services/TravelWiseService.cs`](../src/TravelWise.Api/Services/TravelWiseService.cs) | Saves plans, agent outputs, workflow executions, and audit logs |
| Web approval UI | [`web/src/main.tsx`](../web/src/main.tsx) | Starts an AI review and displays/approves/rejects proposals |

## 3. User-facing AI features

### 3.1 AI trip review

From the trip analytics screen, a user can select **Run AI Review**. The web client sends an objective such as:

> Plan an optimized, safe itinerary with budget checks, place recommendations, and split billing for a trip.

The objective includes the trip name and destination. The API creates a workflow and forwards the objective, destination, and eligible catalog records to the AI service.

### 3.2 Coordinator plan

When a Gemini API key is configured, the coordinator creates a concise structured plan containing:

- `summary`: a short explanation of the proposed approach.
- `steps`: ordered planning steps.
- `approval_reason`: why human review is required.

The prompt instructs Gemini not to invent bookings, prices, weather information, or personal data. Recommendations must use IDs from the approved provider catalog when catalog items are relevant.

If Gemini is not configured and `AI_REQUIRE_GEMINI=false`, the workflow still runs using the deterministic path. In that case, `gemini_plan` is `null` and the model is reported as `deterministic-tools`.

### 3.3 Specialist-agent analysis

The orchestrator always creates four distinct specialist agents:

1. **Budget Agent** — budget health and overspending analysis.
2. **Activity Agent** — schedule conflict checks and approved place recommendations.
3. **Risk Agent** — destination safety and weather advisory.
4. **Split-Bill Agent** — shared-expense balances and settlement analysis.

Each agent receives only the tools needed for its responsibility. This least-privilege design makes the workflow easier to inspect and prevents one agent from silently performing unrelated operations.

### 3.4 Human-in-the-loop approval

Valid proposals enter `AWAITING_APPROVAL`. The web approval queue displays:

- The workflow status.
- The original objective.
- The coordinator plan JSON, when available.
- The specialist-agent result JSON.
- Approve and reject actions.

Approval does not happen automatically. An authorized user must explicitly approve or reject the proposal. The decision is stored as `Approved` or `Rejected` and written to the audit log.

### 3.5 Auditability

The API records:

- `WORKFLOW_CREATED` when the workflow is created.
- `AI_RESULT_RECEIVED` when the Python result is persisted.
- One `AGENT_COMPLETED` execution record per specialist agent.
- `APPROVED` or `REJECTED` when a reviewer makes a decision.

The workflow stores the serialized plan in `PlanJson` and specialist results in `ResultJson`. These records support inspection from the audit and approval views.

## 4. Python service models

### `WorkflowState`

The Python service defines these states:

```text
CREATED
PLANNING
DELEGATING
AGENTS_RUNNING
VALIDATING
AWAITING_APPROVAL
COMPLETED
VALIDATION_FAILED
AGENT_FAILED
```

The current orchestration completes synchronously and normally returns `AWAITING_APPROVAL`. The intermediate states describe the intended workflow lifecycle and are available for future asynchronous execution.

### `WorkflowRequest`

```json
{
  "workflow_id": "guid",
  "objective": "Prepare a safe group trip plan",
  "destination": "Ella",
  "catalog_items": []
}
```

Validation rules:

- `workflow_id` must be a UUID.
- `objective` must contain 10–1000 characters.
- `destination` is optional and may contain up to 200 characters.
- `catalog_items` defaults to an empty list and accepts at most 50 records.

### `WorkflowResponse`

The response contains:

| Field | Description |
|---|---|
| `workflow_id` | ID shared with the API workflow record |
| `objective` | Requested travel objective |
| `state` | Orchestration/validation state |
| `plan` | Deterministic workflow steps |
| `agents` | Four specialist-agent results |
| `validation` | Schema, model, business-rule, and safe-failure information |
| `approval_required` | `true` when the result must be reviewed |
| `updated_at` | UTC result timestamp |
| `model` | Gemini model name or `deterministic-tools` |
| `gemini_plan` | Structured Gemini response, or `null` |

## 5. Deterministic tools and functions

The tool registry in `main.py` maps tool names to Python functions. An agent can call only the names assigned to it.

### `get_expenses(context)`

Returns the expense total, currency, and items. The current implementation returns an empty LKR expense set:

```json
{"total": 0, "currency": "LKR", "items": []}
```

It is a safe deterministic fallback and should be connected to persisted trip expenses if live budget analysis is required.

### `check_conflict(context)`

Checks activity scheduling conflicts. The current fallback returns no conflict:

```json
{"has_conflict": false, "conflicts": []}
```

### `get_weather(context)`

Returns a safe weather-advisory structure:

```json
{
  "provider": "safe-demo-fallback",
  "severity": "LOW",
  "advisory": "No live weather configured."
}
```

This is deliberately explicit about the absence of live weather data.

### `calculate_balances(context)`

Calculates group balances. The current fallback returns no balances:

```json
{"balances": [], "net_balance_sum": 0}
```

### `convert_currency(context)`

Provides a currency conversion result. The current fallback uses a same-currency rate of 1:

```json
{"rate": 1, "source": "same-currency fallback"}
```

### `generate_settlement_plan(context)`

Creates transfers for shared expenses. The current fallback produces no transfers:

```json
{"transfers": [], "transaction_count": 0}
```

### `search_catalog(context)`

Searches the approved catalog records forwarded by the API. It:

- Separates `VisitingPlace`, `Restaurant`, `Accommodation`, and `FoodPrice` records.
- Returns the original records and total count.
- Produces a category summary for the destination.
- Marks the source as `approved-provider-catalog`.

The API filters catalog data to active and approved records and prefers records matching the trip destination before sending up to 50 items to the AI service.

## 6. Agent responsibilities and tool access

| Agent | Responsibility | Tools |
|---|---|---|
| Budget Agent | Budget health and overspending analysis | `GetExpenses` |
| Activity Agent | Schedule conflict analysis and approved place recommendations | `CheckConflict`, `SearchCatalog` |
| Risk Agent | Safety and weather advisory | `GetWeather` |
| Split-Bill Agent | Shared-expense settlement analysis | `CalculateBalances`, `ConvertCurrency`, `GenerateSettlementPlan` |

The `run_agent()` function executes the assigned tools and returns:

```json
{
  "agent": "Activity Agent",
  "responsibility": "Activity schedule conflict analysis and approved place recommendations.",
  "output": {},
  "tools_used": ["CheckConflict", "SearchCatalog"]
}
```

## 7. Orchestration and validation flow

`orchestrate()` performs the following steps:

1. Defines the workflow plan.
2. Builds a context containing the workflow ID, objective, destination, and catalog.
3. Instantiates the four specialist agents.
4. Runs each agent with its assigned tools.
5. Calls `generate_plan()` for Gemini when `GEMINI_API_KEY` is available.
6. Validates that all agent outputs are present.
7. Validates that the optional model response is a dictionary.
8. Includes the business-rule identifiers:
   - `BR-BUD-01`
   - `BR-ACT-01`
   - `BR-RISK-01`
   - `BR-SPLIT-01`
   - `BR-SPLIT-02`
9. Returns `AWAITING_APPROVAL` when validation succeeds.
10. Returns `VALIDATION_FAILED` when validation fails.

The deterministic validation result is authoritative. Gemini provides planning language but cannot write database records, bypass API validation, or approve its own recommendation.

## 8. Service endpoints

### `GET /health`

Returns a service health response:

```json
{"status": "ok", "service": "travelwise-agentic-ai"}
```

### `POST /internal/workflows`

Starts a workflow. The endpoint:

- Validates the Pydantic request model.
- Runs the orchestrator.
- Stores the in-memory Python response by workflow ID.
- Returns a `WorkflowResponse`.
- Returns HTTP 502 with a safe failure message if orchestration raises an exception.

### `GET /internal/workflows/{workflow_id}`

Returns a previously started workflow held by the Python service. It returns HTTP 404 when the ID is unknown.

The Python endpoint is intended to be internal. The public application flow is `POST /api/workflows` on the ASP.NET API.

### ASP.NET public workflow endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/workflows` | Creates a workflow, gathers approved catalog data, calls Python, and persists the response |
| `GET /api/workflows/{id}` | Reads the persisted workflow |
| `POST /api/workflows/{id}/approval` | Approves or rejects a workflow with an optional comment |

## 9. Gemini integration

Gemini is integrated in [`ai-service/app/gemini.py`](../ai-service/app/gemini.py) with the Google `google-genai` SDK.

### Prompt constraints

The coordinator prompt requires:

- Safe and concise travel planning.
- JSON-only output.
- The keys `summary`, `steps`, and `approval_reason`.
- No invented bookings, prices, weather, or personal data.
- Provider recommendations to use approved catalog item IDs.

### Response constraints

The Gemini request uses:

- `response_mime_type="application/json"`.
- A low temperature of `0.2`.
- The configured `GEMINI_MODEL`.

The response is rejected if it is empty, cannot be parsed as JSON, is not an object, or does not contain a list in `steps`.

## 10. Configuration

Copy [`ai-service/.env.example`](../ai-service/.env.example) to `ai-service/.env` and configure:

```env
GEMINI_API_KEY=replace-with-your-google-ai-studio-key
GEMINI_MODEL=gemini-3.1-flash-lite
AI_REQUIRE_GEMINI=false
AI_INTERNAL_API_KEY=replace-with-a-long-random-service-key
```

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio key used by the Python service |
| `GEMINI_MODEL` | Gemini model identifier; defaults to `gemini-3.1-flash-lite` |
| `AI_REQUIRE_GEMINI` | When `true`, missing Gemini credentials fail the workflow; when `false`, deterministic mode is allowed |
| `AI_INTERNAL_API_KEY` | Reserved internal-service secret configuration; the current `AiWorkflowClient` does not yet attach it to requests |
| `AI_SERVICE_URL` | Configured in the ASP.NET API and used to locate the Python service |

Never place `GEMINI_API_KEY` in React, Flutter, browser code, source control, or the public API response.

## 11. Local setup

From the `TravelWise` directory:

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

Configure the ASP.NET API to use:

```json
{
  "AI_SERVICE_URL": "http://localhost:8000"
}
```

Run the AI tests:

```powershell
cd ai-service
pytest
```

The tests do not require a Gemini key because the default local mode uses the deterministic path.

## 12. Deployment

The AI container is defined in [`deploy/ai.Dockerfile`](../deploy/ai.Dockerfile). It:

1. Uses Python 3.12.
2. Installs `ai-service/requirements.txt`.
3. Copies the Python `app` package.
4. Runs Uvicorn on port `10000`.

The Render configuration in [`render.yaml`](../render.yaml) deploys a separate `travelwise-ai` service. Production deployment sets `AI_REQUIRE_GEMINI=true`, so a missing Gemini key is treated as a configuration failure rather than silently switching to deterministic mode.

## 13. Security and safety controls

- Browser and mobile clients do not call Gemini directly.
- The ASP.NET API remains the authentication, authorization, and persistence boundary.
- Only active and approved provider catalog items are forwarded to AI.
- The Gemini prompt prohibits fabricated travel facts and personal data.
- Deterministic validation remains authoritative over model output.
- High-impact recommendations stop at human approval.
- Workflow and approval events are auditable.
- External-service failures are surfaced as safe failures rather than treated as successful recommendations.
- Secrets belong in environment configuration and must not be committed.

## 14. Current limitations and extension points

The following functions currently use explicit safe demo fallbacks rather than live data:

- `get_expenses()`
- `check_conflict()`
- `get_weather()`
- `calculate_balances()`
- `convert_currency()`
- `generate_settlement_plan()`

The next implementation steps for production-grade intelligence would be:

1. Pass the relevant persisted trip expenses and activities into the AI context.
2. Replace fallback weather data with the existing backend weather integration.
3. Reuse the API's settlement calculations instead of returning empty transfers.
4. Add authenticated service-to-service communication using `AI_INTERNAL_API_KEY`.
5. Move Python workflow storage from the in-memory `_workflows` dictionary to durable storage or rely exclusively on the API's persisted workflow record.
6. Add stricter validation for the complete Gemini schema, including `summary`, `approval_reason`, and each step's type.
7. Add authorization checks so approval is limited to the intended reviewer roles.
8. Add integration tests covering Gemini success, invalid model JSON, missing service configuration, API timeouts, and approval transitions.

These limitations are intentionally documented so that deterministic demo behavior is not confused with live external data or autonomous booking.

## 15. Verification checklist

- [ ] `GET /health` returns `status: ok`.
- [ ] `pytest` passes in `ai-service`.
- [ ] The API can reach the configured `AI_SERVICE_URL`.
- [ ] A trip has active, approved catalog records when recommendations are expected.
- [ ] A workflow reaches `AwaitingApproval` when deterministic validation succeeds.
- [ ] The approval queue displays the coordinator and specialist outputs.
- [ ] Approve and reject actions create corresponding audit events.
- [ ] Gemini mode is tested with `AI_REQUIRE_GEMINI=true` only when a valid key is available.
- [ ] No secret appears in source control, client bundles, logs, or screenshots.

