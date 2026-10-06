# Architecture Decision Record

## ADR-001: Shared API boundary

**Context:** React and Flutter must share identity, permissions, business rules and data.  
**Decision:** Both clients call only the ASP.NET Core Web API. The API calls the internal Python service.  
**Consequences:** One authoritative security and validation boundary; the Python service is not publicly exposed.

## ADR-002: Supabase PostgreSQL and EF Core

**Context:** The assignment requires a relational database, migrations, constraints and audit fields.  
**Decision:** Use Supabase PostgreSQL through Npgsql and EF Core migrations. Supabase Auth manages identity and Storage is used for receipts.  
**Consequences:** Managed PostgreSQL and Auth reduce operational work, while database rules remain testable in the API.

## ADR-003: Python FastAPI and four agents

**Context:** The system needs planning, delegation, controlled tools, validation, approval and observability.  
**Decision:** Use a Python FastAPI internal service with a central orchestrator and four separate agents: Budget, Activity, Risk and Split-Bill.  
**Consequences:** Python supports the AI workflow while C# remains authoritative for business rules and persistence.

## ADR-004: Client state management

**Context:** React needs shared API/loading/error state and Flutter needs protected mobile workflows.  
**Decision:** Start with small feature-local state in React hooks and Flutter `StatefulWidget`s; move to Redux Toolkit and Riverpod when the four feature modules are expanded.  
**Consequences:** The initial scaffold stays simple, while the final implementation must document the chosen production state libraries and use them consistently.

## ADR-005: Approval and safe failure

**Context:** High-impact recommendations cannot execute automatically.  
**Decision:** Every recommendation pauses at `AWAITING_APPROVAL`; only an authorized reviewer can approve or reject it. Schema failures, tool failures and external-service failures produce an auditable safe failure.  
**Consequences:** The demo can prove human oversight and recoverable agent behaviour.

## ADR-006: Mobile API gateway

**Context:** The mobile app must not connect directly to the Supabase database or Supabase service APIs. Database writes and business rules must remain behind the ASP.NET Core boundary.

**Decision:** Flutter calls only ASP.NET Core endpoints. The API validates the Supabase access token, forwards mobile authentication requests to Supabase Auth, and forwards authenticated receipt uploads to Supabase Storage. The Supabase anon key is stored only in the API configuration.

**Consequences:** Mobile data access, validation, authorization and audit behaviour use the same API boundary as the web client. The API must be running before the mobile app can sign in or load data.

## ADR-007: Project structure

**Context:** TravelWise contains a web client, mobile client, ASP.NET Core API, internal Python agentic AI service, database documentation, deployment configuration and automated tests. The structure must make the ownership and communication boundaries between these parts clear.

**Decision:** Organize the repository as a multi-application solution under one `TravelWise` root. Client applications communicate through the ASP.NET Core API; the API owns authentication, authorization, persistence and business rules; the Python service owns orchestration and AI-specific processing; deployment and documentation remain at the repository root or in dedicated folders.

### Complete source project tree

Generated and dependency directories such as `node_modules`, `.dart_tool`, `build`, `bin`, `obj`, `__pycache__` and `.pytest_cache` are intentionally excluded from this source tree. They are recreated by the relevant build or package manager.

```text
TravelWise/
├── .github/
│   └── workflows/
│       └── ci.yml                         # Continuous integration workflow
├── ai-service/                             # Internal Python agentic AI service
│   ├── app/
│   │   ├── __init__.py                     # AI package marker
│   │   ├── main.py                         # FastAPI app, models, tools, agents and orchestration
│   │   └── gemini.py                       # Optional Google Gemini structured-plan integration
│   ├── tests/
│   │   └── test_orchestrator.py            # AI orchestration and validation tests
│   ├── .env.example                         # AI service configuration template
│   └── requirements.txt                     # Python dependencies
├── deploy/
│   ├── ai.Dockerfile                        # Python AI service container image
│   └── api.Dockerfile                       # ASP.NET Core API container image
├── docs/
│   ├── ADR.md                               # Architecture decisions and project structure
│   ├── AI_FEATURES.md                       # AI features, functions, workflow and limitations
│   ├── PROJECT_PROGRESS.md                  # Implementation progress and verification notes
│   ├── schema.sql                           # Database schema reference
│   ├── SUPABASE_SETUP.md                    # Supabase project and database setup
│   └── SUPABASE_STORAGE.sql                 # Receipt-storage bucket and policy definitions
├── mobile/                                  # Flutter mobile client
│   ├── android/                             # Android host project and Gradle configuration
│   │   ├── app/
│   │   │   └── src/                         # Android application source and resources
│   │   ├── gradle/
│   │   │   └── wrapper/                     # Gradle wrapper files
│   │   ├── build.gradle.kts
│   │   ├── gradle.properties
│   │   ├── gradlew.bat
│   │   └── settings.gradle.kts
│   ├── lib/
│   │   └── main.dart                        # Flutter application entry point and client UI
│   ├── test/
│   │   └── widget_test.dart                 # Flutter widget tests
│   ├── analysis_options.yaml                # Dart analyzer configuration
│   ├── pubspec.yaml                          # Flutter dependencies and project metadata
│   └── pubspec.lock                          # Resolved Flutter dependency versions
├── src/
│   └── TravelWise.Api/                      # ASP.NET Core API and authoritative business boundary
│       ├── Contracts/
│       │   ├── AuthContracts.cs              # Authentication request/response contracts
│       │   ├── CatalogContracts.cs           # Provider catalog contracts
│       │   └── Requests.cs                   # Trip, budget, expense, activity and workflow requests
│       ├── Controllers/
│       │   ├── ActivitiesController.cs       # Activity management endpoints
│       │   ├── AuditLogsController.cs        # Audit history endpoints
│       │   ├── AuthController.cs             # Authentication endpoints
│       │   ├── BudgetsController.cs          # Trip budget endpoints
│       │   ├── CatalogController.cs          # Provider catalog endpoints
│       │   ├── ExpensesController.cs         # Shared-expense endpoints
│       │   ├── GroupController.cs            # Group-member endpoints
│       │   ├── ReceiptsController.cs         # Receipt upload and retrieval endpoints
│       │   ├── RisksController.cs            # Risk and safety endpoints
│       │   ├── SettlementsController.cs      # Expense settlement endpoints
│       │   ├── TripsController.cs            # Trip management endpoints
│       │   ├── WeatherController.cs          # Weather lookup endpoint
│       │   ├── WeatherForecastController.cs  # Default/sample forecast endpoint
│       │   ├── WorkflowExecutionsController.cs # Agent execution history endpoints
│       │   └── WorkflowsController.cs        # AI workflow and approval endpoints
│       ├── Data/
│       │   ├── Migrations/                  # EF Core database migrations
│       │   └── TravelWiseDbContext.cs       # EF Core database context and mappings
│       ├── Models/
│       │   └── DomainModels.cs               # Trips, members, expenses, workflows and domain enums
│       ├── Properties/
│       │   └── launchSettings.json           # Local API launch profiles
│       ├── Services/
│       │   ├── AiWorkflowClient.cs            # API-to-Python AI service client
│       │   └── TravelWiseService.cs           # Core application and persistence services
│       ├── Program.cs                         # API startup, dependency injection and middleware
│       ├── TravelWise.Api.csproj              # .NET project and package references
│       ├── TravelWise.Api.http                # HTTP request examples
│       ├── WeatherForecast.cs                 # Sample forecast model
│       ├── appsettings.json                   # Shared API configuration
│       ├── appsettings.Development.json      # Development API configuration
│       ├── appsettings.Local.json             # Local API configuration
│       └── appsettings.Local.json.example     # Local configuration template
├── web/                                      # React/Vite web dashboard
│   ├── src/
│   │   ├── main.tsx                          # Dashboard UI, API calls and AI approval queue
│   │   └── style.css                         # Dashboard styling
│   ├── .env.example                           # Web configuration template
│   ├── index.html                             # Vite HTML entry point
│   ├── package.json                            # JavaScript dependencies and scripts
│   ├── package-lock.json                       # Resolved JavaScript dependency versions
│   └── vite.config.ts                         # Vite development/build configuration
├── .gitignore                                # Repository ignore rules
├── README.md                                 # Project overview and quick-start guide
├── RUN_GUIDE.md                              # Detailed local, API, AI and deployment instructions
├── TravelWise.sln                            # .NET solution file
└── render.yaml                               # Render deployment services and environment variables
```

### Component responsibilities

| Component | Owns | Must communicate through |
|---|---|---|
| `web/` | Browser dashboard, provider catalog UI, trip views and AI approval queue | ASP.NET Core API |
| `mobile/` | Flutter mobile experience and Android packaging | ASP.NET Core API |
| `src/TravelWise.Api/` | Identity boundary, authorization, validation, database writes, audit logs and public HTTP API | Supabase PostgreSQL/Auth/Storage and internal AI service |
| `ai-service/` | Workflow planning, specialist agents, controlled tools, Gemini calls and model-output validation | Internal API request from ASP.NET Core |
| `docs/` | Architecture, AI behavior, database setup and project evidence | Developers, reviewers and operators |
| `deploy/` | Container build definitions | Deployment platform |
| `.github/workflows/` | Automated build and test execution | Source-control CI environment |

### Request and data ownership

1. The web or mobile client authenticates and sends a request to the ASP.NET Core API.
2. The API validates identity, permissions and request data.
3. The API reads or writes Supabase data through EF Core/Npgsql and its service layer.
4. For an AI review, the API selects only active, approved catalog records and calls `ai-service`.
5. The Python service returns structured agent and coordinator output.
6. The API persists the workflow result and agent execution records.
7. The client reads the result from the API and an authorized reviewer approves or rejects it.

**Consequences:** The repository has clear ownership boundaries, clients cannot bypass API rules, AI code can be deployed independently, and generated build artifacts do not obscure the maintainable source structure. Changes that cross these boundaries must update the relevant contract, documentation and tests.
