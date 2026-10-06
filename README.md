# TravelWise

For a beginner-friendly start-to-finish run guide, read [RUN_GUIDE.md](RUN_GUIDE.md).

TravelWise is an AI-native group travel platform for planning a trip, controlling the budget, scheduling activities, checking safety, and settling shared expenses.

This repository follows the SE3090 Assignment 1 specification and the TravelWise project proposal:

| Member | Business component | AI responsibility |
|---|---|---|
| Member 1 | Budget and Expense Management | Budget Agent |
| Member 2 | Experience and Activity Planning | Activity Agent |
| Member 3 | Travel Safety and Risk Management | Risk Agent |
| Member 4 | Group Split Billing and Shared Expenses | Split-Bill Agent |

Every member must contribute to the C# API, PostgreSQL/Supabase data model, React web app, Flutter app, tests, Git history, documentation, and their assigned agent. Do not use a project-manager-only role.

## Architecture

```text
React / Next.js dashboard ─┐
                            ├── ASP.NET Core Web API ── Supabase PostgreSQL
Flutter mobile app ─────────┘          │
                                       └── internal FastAPI Agentic AI service
                                            ├── Budget Agent
                                            ├── Activity Agent
                                            ├── Risk Agent
                                            └── Split-Bill Agent
```

Clients never call the Python service directly. The API is the authoritative layer for authentication, authorization, validation, business rules, database writes, approval, and audit logging.

## Repository structure

- `src/TravelWise.Api`: ASP.NET Core Web API, EF Core models, services, controllers, health and Swagger.
- `ai-service`: Python FastAPI orchestrator, four specialized agents, allow-listed tools, Pydantic contracts and tests.
- `web`: React/Vite dashboard for trips and approval.
- `mobile`: Flutter/Dart mobile app with camera receipt capture, secure storage dependency and shared API access.
- `docs`: ADRs, database schema, test/evaluation evidence templates.
- `.github/workflows`: CI for the API and Python service.

## Minimum agent workflow

1. A client starts a workflow through `POST /api/workflows`.
2. The API validates and stores the workflow in PostgreSQL.
3. The API calls the internal Python service.
4. The orchestrator creates a structured plan and delegates to four distinct agents.
5. Agents use only allow-listed tools with structured outputs.
6. Outputs are checked against schema and TravelWise business rules.
7. The workflow enters `AWAITING_APPROVAL` for a high-impact recommendation.
8. An authorized reviewer approves or rejects through `POST /api/workflows/{id}/approval`.
9. The final status and audit event are stored by the API and shown to both clients.

The Python service uses safe demo fallbacks when external weather or production data is not configured. Production integration must set timeouts, retry limits, secrets, and a real weather provider through the API.

## Local setup

### API

Install the .NET 8 SDK, create a Supabase project, and set:

```powershell
$env:ConnectionStrings__Supabase="Host=...;Port=5432;Database=postgres;Username=postgres;Password=..."
$env:AI_SERVICE_URL="http://localhost:8000"
dotnet restore
dotnet run --project src\TravelWise.Api
```

Swagger: `http://localhost:5000/swagger`  
Health: `http://localhost:5000/health`

Before production use, add the Supabase EF Core migrations and configure Supabase Auth JWT validation. The current scaffold intentionally keeps local development open so the workflow can be tested without a Supabase project. Never commit connection strings, JWT secrets, service-role keys, or API keys.

#### Supabase database connection

The API reads `src\TravelWise.Api\appsettings.Local.json`. Create it by copying `appsettings.Local.json.example`, then replace `YOUR_SUPABASE_HOST` and `YOUR_DATABASE_PASSWORD`. This local file is ignored by Git.

In Supabase, create a project, wait for it to finish, open **Connect** or **Project Settings → Database**, and copy the Postgres connection string for .NET/Npgsql. Use the Session pooler connection if your network has IPv4 problems. The API uses that PostgreSQL connection through EF Core and Npgsql.

The Supabase Project URL and anon key are for Auth/Storage; they are not the PostgreSQL password. Never expose the service-role key in React or Flutter.

### Correct Supabase setup

The API reads `src\TravelWise.Api\appsettings.Local.json`, not the example file. Copy the example, replace the host and password, and keep the local file private:

```powershell
Copy-Item src\TravelWise.Api\appsettings.Local.json.example src\TravelWise.Api\appsettings.Local.json
dotnet ef database update --project src\TravelWise.Api --startup-project src\TravelWise.Api
dotnet run --project src\TravelWise.Api
```

The EF Core migrations are in `src\TravelWise.Api\Data\Migrations`. The database connection was tested successfully against the configured Supabase project. The API also exposes `GET /api/weather?destination=Ella` using Open-Meteo through the backend.

### Python Agentic AI

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env and add your Gemini API key.
uvicorn app.main:app --reload --port 8000
pytest
```

The real AI provider is Google Gemini. The service uses `GEMINI_MODEL` (default:
`gemini-3.1-flash-lite`) to create a structured coordinator plan. The four
specialist tools and C# business-rule validation remain deterministic, so an AI
model cannot directly change database records or bypass approval. Set
`AI_REQUIRE_GEMINI=true` when Gemini must be available; otherwise local tests
use the deterministic safe path when no key is configured. Never commit `.env`.

To enable the real model:

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create a Gemini API key.
3. Put the key only in `ai-service\.env` as `GEMINI_API_KEY=...`.
4. Set `AI_REQUIRE_GEMINI=true`.
5. Start the Python service again.

The key must never be placed in React, Flutter, GitHub, or this chat.

### Web dashboard

```powershell
cd web
npm install
$env:VITE_API_URL="http://localhost:5127"
npm run dev
```

### Flutter app

Install Flutter, then:

```powershell
cd mobile
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:5127
```

The mobile client calls only the ASP.NET Core API. The API forwards Auth and receipt Storage requests to Supabase, so the mobile app never connects directly to the Supabase database, Auth API or Storage API. It includes secure token storage, trip creation, budget/expense/activity/risk/group screens, settlement display, AI workflow approval, and camera receipt capture. The Android camera permission is already included. For a debug APK:

```powershell
flutter build apk --debug --dart-define=API_URL=http://10.0.2.2:5127
```

For a physical phone, replace `10.0.2.2` with the computer's local network IP. Never commit the anon key to source control if the project settings are not public.

## Business rules

- `BR-BUD-01`: expense amounts must be greater than zero.
- `BR-ACT-01`: activities must not overlap.
- `BR-RISK-01`: risk severity must use the approved severity schema.
- `BR-SPLIT-01`: expense split values must equal the total expense.
- `BR-SPLIT-02`: all net balances must sum to zero.

These rules must be enforced in C# services, not trusted from AI output.

## Testing, delivery and evidence

The assignment requires API, database, React, Flutter, end-to-end, performance, and Agentic AI golden-case testing. Keep real test output and screenshots in the final consolidated report. Do not fabricate evidence or back-fill commits.

Required final evidence includes a deployed API health and Swagger URL, Supabase deployment, live web URL, Flutter APK, AI setup instructions, a 10-minute demonstration video, ADRs, individual contribution statements, AI usage logs/reflections, and GitHub Actions history. Keep all evaluator links available until 21 October 2026.

## AI usage and academic integrity

AI assistance is permitted during development at Level 4, but each student must record the tool, model, task, output, changes/rejections, and verification. Every student must understand and be able to explain, test, modify, and debug their own work. External AI tools are not allowed during the final demonstration or viva.
