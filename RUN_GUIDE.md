# TravelWise: Complete Run Guide

This guide explains how to run the whole TravelWise project from the beginning.

The project has four parts:

1. Supabase PostgreSQL, Auth and Storage
2. ASP.NET Core API
3. Python Gemini AI service
4. React web dashboard and Flutter mobile app

You need several terminal windows because the API, AI service, web app and mobile app run at the same time.

---

## 1. What you need to install

Install these programs before starting:

- Git
- .NET 8 SDK
- Python 3.11 or newer
- Node.js 18 or newer
- Flutter SDK
- Android Studio and Android SDK, if you want to run the mobile app

Check the installations:

```powershell
dotnet --version
python --version
node --version
npm --version
C:\flutter\bin\flutter.bat --version
```

If Flutter is installed in another folder, replace `C:\flutter\bin\flutter.bat` with your Flutter path.

Run Flutter checks:

```powershell
C:\flutter\bin\flutter.bat doctor
```

Fix all important errors shown by `flutter doctor` before trying to build the APK.

---

## 2. Open the project folder

Open PowerShell and go to the project root:

```powershell
cd "C:\Users\Arosha Induma\OneDrive\Desktop\SEF final project\new\TravelWise"
```

All commands in this guide start from this folder unless another folder is shown.

---

## 3. Prepare Supabase

### 3.1 Create or open the project

1. Open [Supabase](https://supabase.com).
2. Open the TravelWise project.
3. The project URL is:

```text
https://fhnttrinouhhkjmmvydr.supabase.co
```

4. In **Authentication → Providers**, enable **Email**.
5. In **Authentication → Users**, create a test user, or use the registration screen later.

For local testing, choose one of these options:

- Keep **Confirm email** enabled and click the confirmation link sent to the test user's inbox.
- Temporarily turn **Confirm email** off in the Email provider settings. This is easier for local testing, but email confirmation should be enabled again before production.

If the web screen says **Email not confirmed**, the password is not the problem. Open the confirmation email, or use the **Resend confirmation email** button now shown by the web app.

### 3.2 Get the database connection string

1. In Supabase, click **Connect**.
2. Select the PostgreSQL connection string for .NET/Npgsql.
3. If the direct connection does not work, use the **Session pooler** connection.
4. Keep the connection string private. It contains the database password.

### 3.3 Create the local API configuration

Run:

```powershell
Copy-Item src\TravelWise.Api\appsettings.Local.json.example src\TravelWise.Api\appsettings.Local.json
notepad src\TravelWise.Api\appsettings.Local.json
```

Change only the private database connection values:

```json
{
  "ConnectionStrings": {
    "Supabase": "Host=YOUR_HOST;Port=5432;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
  },
  "AI_SERVICE_URL": "http://localhost:8000",
  "Supabase": {
    "Url": "https://fhnttrinouhhkjmmvydr.supabase.co",
    "AnonKey": "YOUR_SUPABASE_ANON_KEY"
  }
}
```

Do not commit this file. It is already ignored by Git.

### 3.4 Apply the database migrations

Make sure `appsettings.Local.json` contains the real connection string, then run:

```powershell
dotnet restore
dotnet ef database update --project src\TravelWise.Api --startup-project src\TravelWise.Api
```

This creates the TravelWise tables in Supabase.

### 3.5 Create the receipt Storage bucket

1. In Supabase, open **SQL Editor**.
2. Open the local file [docs/SUPABASE_STORAGE.sql](docs/SUPABASE_STORAGE.sql).
3. Copy all its SQL into the Supabase SQL Editor.
4. Click **Run**.

This creates a private bucket named `receipts` and authenticated upload/read policies. Flutter uploads receipts through `POST /api/receipts`; it does not call Supabase Storage directly.

### 3.6 Get the public anon key

In Supabase, open **Project Settings → API** and copy the public **anon** key. Put it in the private API configuration as `Supabase:AnonKey`; do not put it in Flutter.

The API uses the anon key server-side when it forwards Auth and Storage requests to Supabase. Flutter does not receive this key and does not call Supabase directly.

---

## 4. Prepare and start the Python Gemini AI service

Open **Terminal 1**:

```powershell
cd "C:\Users\Arosha Induma\OneDrive\Desktop\SEF final project\new\TravelWise\ai-service"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

Set the values in `.env`:

```env
GEMINI_API_KEY=YOUR_REAL_GOOGLE_AI_STUDIO_KEY
GEMINI_MODEL=gemini-3.1-flash-lite
AI_REQUIRE_GEMINI=true
AI_INTERNAL_API_KEY=CREATE_A_LONG_RANDOM_VALUE
```

Create a Gemini key at [Google AI Studio](https://aistudio.google.com/app/apikey).

Do not send the Gemini key in chat and do not commit `.env`.

Start the AI service:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Keep this terminal open.

The AI service runs at:

```text
http://localhost:8000
```

---

## 5. Start the ASP.NET Core API

Open **Terminal 2**:

```powershell
cd "C:\Users\Arosha Induma\OneDrive\Desktop\SEF final project\new\TravelWise"
dotnet run --project src\TravelWise.Api --launch-profile http
```

The current HTTP launch profile uses port `5127`.

Check the API:

- Health: `http://localhost:5127/health`
- Swagger: `http://localhost:5127/swagger`

The health page should return a healthy response after the Supabase database is reachable.

Keep this terminal open.

---

## 6. Prepare and start the React web dashboard

Open **Terminal 3**:

```powershell
cd "C:\Users\Arosha Induma\OneDrive\Desktop\SEF final project\new\TravelWise\web"
npm install
Copy-Item .env.example .env
notepad .env
```

Set `.env` like this:

```env
VITE_API_URL=http://localhost:5127
VITE_SUPABASE_URL=https://fhnttrinouhhkjmmvydr.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_SUPABASE_ANON_KEY
```

Start the web dashboard:

```powershell
npm run dev
```

Open the URL printed by Vite, usually:

```text
http://localhost:5173
```

Use **Create account** to register, or sign in with an existing Supabase user.

The web dashboard can:

- Sign in and register
- Create trips
- View budgets
- View expenses
- View activities
- View risks
- View group members
- View settlements
- Start an AI workflow
- Approve or reject an AI workflow

---

## 7. Prepare and run the Flutter mobile app

Before running Flutter, make sure the API is already running.

### 7.1 Install packages

Open **Terminal 4**:

```powershell
cd "C:\Users\Arosha Induma\OneDrive\Desktop\SEF final project\new\TravelWise\mobile"
C:\flutter\bin\flutter.bat pub get
```

### 7.2 Start on an Android emulator

For the Android emulator, `10.0.2.2` means the Windows computer running the API.

```powershell
C:\flutter\bin\flutter.bat run `
  --dart-define=API_URL=http://10.0.2.2:5127
```

### 7.3 Start on a physical Android phone

1. Connect the phone and computer to the same Wi-Fi network.
2. Find the computer IPv4 address:

```powershell
ipconfig
```

3. Replace `10.0.2.2` with the computer IPv4 address:

```powershell
C:\flutter\bin\flutter.bat run `
  --dart-define=API_URL=http://YOUR_COMPUTER_IP:5127
```

The mobile app includes:

- Supabase login and registration
- Secure access-token storage
- Trip list and trip creation
- Budget, expense, activity and risk records
- Group members
- Settlement display
- AI workflow approval and rejection
- Camera receipt capture and Supabase Storage upload

---

## 8. Build the Android APK

Run:

```powershell
cd "C:\Users\Arosha Induma\OneDrive\Desktop\SEF final project\new\TravelWise\mobile"
C:\flutter\bin\flutter.bat build apk --debug `
  --dart-define=API_URL=http://10.0.2.2:5127
```

The APK will be created at:

```text
mobile\build\app\outputs\flutter-apk\app-debug.apk
```

For a release APK, configure a signing key first. Do not distribute an unsigned debug APK as a production application.

---

## 9. Run the project tests

### Backend build

```powershell
dotnet build TravelWise.sln --configuration Release
```

### Python tests

```powershell
cd ai-service
.\.venv\Scripts\Activate.ps1
python -m pytest tests -q
python -m py_compile app\main.py app\gemini.py
```

### React production build

```powershell
cd web
npm run build
```

### Flutter analysis and tests

```powershell
cd mobile
C:\flutter\bin\flutter.bat analyze
C:\flutter\bin\flutter.bat test
```

---

## 10. Test the full workflow manually

1. Start the Python AI service.
2. Start the ASP.NET Core API.
3. Open the React dashboard or Flutter app.
4. Register or sign in.
5. Create a trip.
6. Open the trip.
7. Add a budget, expense, activity, risk or group member.
8. Start the AI workflow.
9. Wait for the workflow status `AwaitingApproval`.
10. Review the recommendation.
11. Approve or reject it.
12. Open the settlement screen.
13. Capture a receipt from the mobile Expenses screen.
14. Confirm that the receipt upload succeeds.

If an AI request fails, check the Gemini key, model name and Python terminal output.

---

## 11. How to stop the project

In each running terminal, press:

```text
Ctrl + C
```

If the Python virtual environment is active, leave it with:

```powershell
deactivate
```

---

## 12. Common problems

### API starts on the wrong port

Always use:

```powershell
dotnet run --project src\TravelWise.Api --launch-profile http
```

The expected port is `5127`. Make sure `VITE_API_URL` and Flutter `API_URL` also use `5127`.

### API says database connection failed

Check:

- `src\TravelWise.Api\appsettings.Local.json` exists.
- The Supabase host is correct.
- The database password is correct.
- `SSL Mode=Require` is present.
- The Supabase project is not paused.
- Migrations were applied with `dotnet ef database update`.

### Web page says Supabase Auth is not configured

Check `web\.env`:

```env
VITE_SUPABASE_URL=https://fhnttrinouhhkjmmvydr.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_SUPABASE_ANON_KEY
```

Restart `npm run dev` after changing `.env`.

### Mobile app cannot connect to the API

- Android emulator: use `http://10.0.2.2:5127`.
- Physical phone: use the computer's local IPv4 address.
- Confirm the API is running.
- Confirm Windows Firewall allows the API port for local network testing.

### Gemini does not work

Check `ai-service\.env`:

```env
GEMINI_API_KEY=YOUR_REAL_KEY
GEMINI_MODEL=gemini-3.1-flash-lite
AI_REQUIRE_GEMINI=true
```

Restart the Python service after changing `.env`.

### Receipt upload fails

Check:

- The `receipts` bucket exists.
- The SQL policies in [docs/SUPABASE_STORAGE.sql](docs/SUPABASE_STORAGE.sql) were run.
- The user is signed in.
- The mobile app received a valid Supabase access token.
- The app was started with `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

---

## 13. Security rules

Never commit or send these values:

- Supabase database password
- Supabase service-role key
- Gemini API key
- API internal service key
- Production JWT secrets

The React web app still uses the public anon key for its browser Auth client. The Flutter app receives only `API_URL`; its Auth and Storage requests go through ASP.NET Core. Never put the service-role key in React or Flutter.

The local private files are ignored by `.gitignore`:

- `src\TravelWise.Api\appsettings.Local.json`
- `web\.env`
- `ai-service\.env`

---

## 14. Production deployment summary

The repository includes deployment configuration, but deployment requires your own accounts.

### Render

Use [render.yaml](render.yaml) to create:

- TravelWise API
- TravelWise Python AI service

Add these environment values in Render:

- `ConnectionStrings__Supabase`
- `AI_SERVICE_URL`
- `Supabase__Url`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_REQUIRE_GEMINI`

### Vercel

Deploy the `web` folder and add:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

After deployment, update Supabase Auth redirect URLs with the Vercel web URL.

---

## 15. Project documentation

Useful files:

- [README.md](README.md): project overview and architecture
- [docs/PROJECT_PROGRESS.md](docs/PROJECT_PROGRESS.md): implementation progress and verification
- [docs/ADR.md](docs/ADR.md): architecture decisions
- [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md): database setup
- [docs/SUPABASE_STORAGE.sql](docs/SUPABASE_STORAGE.sql): receipt bucket policies

## 16. Provider catalog and AI recommendations

Service providers add approved travel data from the web dashboard. The mobile app still calls only the ASP.NET API.

1. In Supabase Dashboard, open **Authentication → Users**, select a test user, and add this value to the user's **app metadata**:

   ```json
   { "role": "ServiceProvider" }
   ```

2. Sign out and sign in again. The API reads the new role from the JWT.
3. Open the **Travel provider catalog** section in the web app.
4. Add a visiting place, restaurant, accommodation or food price.
5. A `ServiceProvider` record starts pending. A `StaffAdmin` user must approve it.
6. Start an AI review for a trip. The API sends only approved, active records for that trip destination to Python and Gemini.

For the approval account, use app metadata:

```json
{ "role": "StaffAdmin" }
```

Do not put service-role keys in the web or mobile applications. The default Supabase JWT role `authenticated` is not enough for provider management.

---

## 17. How to create an Admin account

Admin accounts cannot be created from the public registration screen. This is intentional and enforced by the API. You must create Admin accounts using one of the three methods below.

---

### Method 1 — Supabase Dashboard (Recommended, no code needed)

This is the fastest and safest way.

**Step 1 — Create the user**

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Select the TravelWise project (`fhnttrinouhhkjmmvydr`).
3. Click **Authentication** in the left sidebar.
4. Click **Users**.
5. Click the **"Add user"** button (top right).
6. Enter an email address and a strong password.
7. Click **Create user**.

**Step 2 — Set the Admin role**

1. In the Users list, click the user you just created.
2. Scroll down to the **"User metadata"** section.
3. Find the field labelled **"Raw app meta data"** (not "Raw user meta data").
4. Replace its contents with:

   ```json
   {
     "role": "StaffAdmin",
     "display_name": "System Administrator"
   }
   ```

5. Click **Save**.

**Step 3 — Log in**

1. Open the TravelWise web app at `http://localhost:5173` (or the deployed URL).
2. On the login page, click the **🛡️ System Admin** role tab.
3. Enter the email and password you set in Step 1.
4. Click **Sign In as Admin**.

You will be taken directly to the Admin Panel, which shows the Provider Sign-Up Verification Desk and full system management controls.

---

### Method 2 — Supabase SQL Editor (If you prefer SQL)

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Click **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Paste and run the following SQL, replacing the values in brackets:

   ```sql
   -- Step 1: Create the auth user
   SELECT auth.create_user(
     '{"email": "admin@yourdomain.com", "password": "YourStrongPassword123!", "email_confirm": true}'::jsonb
   );
   ```

5. After the user is created, run a second query to set the admin role:

   ```sql
   -- Step 2: Find the user ID
   SELECT id, email FROM auth.users WHERE email = 'admin@yourdomain.com';

   -- Step 3: Set the StaffAdmin role in app_metadata
   UPDATE auth.users
   SET raw_app_meta_data = raw_app_meta_data || '{"role": "StaffAdmin"}'::jsonb
   WHERE email = 'admin@yourdomain.com';
   ```

6. Log in using Method 1, Step 3.

---

### Method 3 — Temporary API endpoint (If Supabase Dashboard is unavailable)

Use this only if you cannot access the Supabase Dashboard. Remove the endpoint immediately after use.

**Step 1 — Add a temporary seed endpoint**

Open [`src/TravelWise.Api/Controllers/AuthController.cs`](src/TravelWise.Api/Controllers/AuthController.cs) and add this method inside the `AuthController` class, just before the last closing brace:

```csharp
// TEMPORARY — remove this after creating the admin account
[AllowAnonymous, HttpPost("seed-admin")]
public async Task<IActionResult> SeedAdmin([FromBody] AuthCredentials credentials, CancellationToken ct)
{
    var payload = new
    {
        email    = credentials.Email,
        password = credentials.Password,
        data     = new { role = "StaffAdmin", display_name = "System Administrator" }
    };
    return await ForwardRawAuthRequestAsync("/auth/v1/signup", payload, ct);
}
```

**Step 2 — Restart the API**

```powershell
# Stop the running API (Ctrl + C in Terminal 2), then restart:
dotnet run --project src\TravelWise.Api --launch-profile http
```

**Step 3 — Call the endpoint once**

Open PowerShell and run:

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:5127/api/auth/seed-admin" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email": "admin@yourdomain.com", "password": "YourStrongPassword123!"}'
```

You should see a JSON response containing a `session` object. The admin user is created.

**Step 4 — Remove the endpoint immediately**

Delete the `SeedAdmin` method you added in Step 1, then restart the API again.

**Step 5 — Log in**

Follow Method 1, Step 3 to log in.

---

### Admin account security checklist

- [ ] Use a strong, unique password (minimum 12 characters, mix of letters, numbers and symbols).
- [ ] Do not reuse the admin password anywhere else.
- [ ] Do not put the admin email or password in any `.env` file that is committed to Git.
- [ ] Only one or two people should have Admin access.
- [ ] The Admin role is stored in Supabase `app_metadata`, which cannot be changed by the user themselves. Only the Supabase Dashboard or a service-role key can change it.
- [ ] If you used Method 3, confirm the `seed-admin` endpoint has been removed before deploying to production.

---

### What an Admin can do

After logging in with the **🛡️ System Admin** role, the admin can:

- **Approve or reject Service Provider sign-up requests** — from the "📋 Provider Sign-Up Verifications" panel.
  - Approved providers gain access to the Provider Portal.
  - Rejected providers are permanently blocked and see a clear rejection notification when they try to log in.
- **Approve or reject catalog listings** — visiting places, restaurants, accommodation and food prices submitted by providers.
- **View all system audit logs** — every CRUD operation and AI workflow event.
- **View the full AI Approvals Queue**.
- **Manage all trips, budgets and expenses** across all users.

