# TravelWise project progress

Last updated: 2026-10-05

## Completed in this implementation

- Read and mapped the SE3090 assignment and TravelWise proposal.
- Created the monorepo for API, AI service, web, mobile, docs and CI.
- Connected EF Core/Npgsql to Supabase PostgreSQL.
- Created and applied EF Core migrations:
  - initial schema
  - business components
  - relational foreign keys
- Verified a real Supabase insert/read using the API.
- Added trips, budgets, expenses, activities, risks, group members, expense splits, settlements, workflows, audit logs and agent execution records.
- Added activity-overlap, positive-amount, risk-severity, participant and exact-split validation.
- Added minimum-cash-flow settlement calculation.
- Added Open-Meteo weather integration through the C# API.
- Added AI workflow result persistence and four agent execution records.
- Added Gemini SDK integration with structured JSON output:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL=gemini-3.1-flash-lite`
  - safe failure if Gemini is unavailable
- Added optional Supabase JWT validation configuration in ASP.NET Core.
- Added React Supabase Auth sign-in/sign-up/sign-out wiring.
- Added React authorization header forwarding to the API.
- Added React workflow approval/rejection interface.
- Expanded the React dashboard with selectable Budget, Expense, Activity, Risk, Group and Settlement modules.
- Expanded Flutter into an authenticated mobile client with:
  - API-mediated Supabase email sign-in and registration
  - secure access-token storage
  - trip creation and refresh
  - budget, expense, activity, risk and group-member screens
  - settlement display
  - Gemini workflow start and human approval/rejection
  - camera receipt capture uploaded through the API to Supabase Storage
- Generated Android platform files and added camera permission.
- Added Render Docker deployment definitions and Vercel configuration.
- Enforced the mobile architecture: Flutter calls only ASP.NET Core; the API forwards Auth and receipt Storage requests to Supabase.
- Added [RUN_GUIDE.md](../RUN_GUIDE.md), a complete beginner-friendly setup and run guide for Supabase, API, Gemini, React and Flutter.
- Added this progress record.

## Verification completed

- Supabase database migration succeeded.
- API build succeeded.
- API health returned `Healthy`.
- Real API trip creation succeeded.
- Real AI workflow reached `AwaitingApproval`.
- Four workflow execution records were persisted.
- Approval changed the workflow to `Approved`.
- Open-Meteo request succeeded.
- Python tests: 2 passed.
- React production build passed after the Auth dependency update.
- React production build passed after adding the six dashboard modules.
- ASP.NET Core Release build passed with 0 warnings and 0 errors.
- Python tests passed: 2 passed.
- Python syntax compilation passed for the AI service.
- Flutter analyzer passed with no issues.
- Flutter widget test passed.
- Flutter debug APK build is running for the first Android/Gradle build.
- Live AI verification completed locally:
  - Python service health returned `ok`.
  - Gemini model returned a structured plan using `gemini-3.1-flash-lite`.
  - Workflow reached `AWAITING_APPROVAL`.
  - All four agents were returned: Budget, Activity, Risk and Split-Bill.
- Live backend verification completed locally:
  - ASP.NET Core listened on `http://localhost:5127`.
  - `/health` returned `Healthy`.
  - Swagger responded successfully.
  - A trip was created and read from Supabase.
  - A backend-to-Python-to-Gemini workflow reached `AwaitingApproval`.
- Live frontend verification completed locally:
  - Vite started at `http://localhost:5173`.
  - The frontend page returned HTTP 200.
  - The local frontend API URL was corrected to `http://localhost:5127`.
- Improved frontend API error handling so authentication, database and workflow errors are shown as messages instead of breaking trip/module rendering.
- Added a clear Supabase unconfirmed-email message and a resend-confirmation action to the web sign-in screen.

## Still requires user action

These actions require accounts, private credentials, or a physical/mobile environment:

1. Create a Gemini API key in Google AI Studio and put it only in `ai-service/.env`.
2. Put the Supabase anon key in the private API configuration; the mobile app does not receive it.
3. Enable Supabase email authentication and create test users.
4. Create a Supabase Storage bucket named `receipts` and apply private bucket policies.
5. Create GitHub, Render and Vercel accounts and connect this repository.
6. Add Render environment variables in the dashboard.
7. Install/run an Android emulator or device and validate the mobile API workflow end to end.

## Honest status

The project is now a much stronger local integrated system and has a deployable configuration, but it is not honestly claimable as publicly deployed until the user creates the accounts, adds secrets, and runs the deployment steps. The mobile source, Android project and test build are now present. The React app currently provides authentication, trip creation, AI workflow start, and approval/rejection; its remaining limitation is that the four business areas are not yet separated into full desktop pages.

## Provider catalog integration (2026-10-05)

- Added the `TravelCatalogItems` table and applied the EF Core migration to Supabase.
- Added catalog types for visiting places, restaurants, accommodation and food prices.
- Added provider/admin API endpoints:
  - `GET /api/catalog`
  - `POST /api/catalog`
  - `GET /api/catalog/mine`
  - `POST /api/catalog/{id}/approve`
- Provider records require staff approval before they are public or available to AI.
- Added role policies for `ServiceProvider` and `StaffAdmin`. Supabase access tokens must contain the application role in a `role`, `user_role`, `app_role`, or JSON `app_metadata.role` claim.
- Added a web catalog form and approval button.
- Approved catalog items for the trip destination are now sent through the ASP.NET API to the Python AI service. The AI `SearchCatalog` tool and Gemini prompt receive only approved records.
- Verified: Release backend build passed, migration applied, React production build passed, and AI tests passed (`2 passed`).

For local testing, set the role in Supabase Auth user app metadata (not user-editable metadata), then sign in again so a new JWT is issued:

```json
{ "role": "ServiceProvider" }
```

Use `StaffAdmin` for approval access. The normal `authenticated` Supabase role is not an application role and cannot create or approve catalog records.
