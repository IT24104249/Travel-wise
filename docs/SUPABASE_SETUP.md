# Supabase setup in simple steps

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Choose an organization, project name, database password, and region.
4. Wait until the project is ready.

## 2. Copy the PostgreSQL connection string

1. Open the project.
2. Click **Connect**, or open **Project Settings → Database**.
3. Find the PostgreSQL connection string for a .NET/Npgsql client.
4. Copy the Session pooler connection if the direct connection does not work on your network.

The connection string looks similar to this:

```text
Host=...;Port=5432;Database=postgres;Username=postgres;Password=...;SSL Mode=Require;Trust Server Certificate=true
```

Do not share the real value in chat or commit it to GitHub.

## 3. Put it in the API

From the TravelWise folder, run:

```powershell
Copy-Item src\TravelWise.Api\appsettings.Local.json.example src\TravelWise.Api\appsettings.Local.json
```

Open `src\TravelWise.Api\appsettings.Local.json` and replace:

- `YOUR_SUPABASE_HOST` with the host from Supabase.
- `YOUR_DATABASE_PASSWORD` with the database password created in step 1.

The API loads this file in `Program.cs`. It calls `UseNpgsql(...)`, so Entity Framework Core uses Supabase PostgreSQL.

## 4. Start the API

```powershell
dotnet run --project src\TravelWise.Api
```

Open:

- `http://localhost:5000/swagger` for the API screen.
- `http://localhost:5000/health` for the health check.

The project now contains EF Core migrations. After creating or changing the database schema, apply them with:

```powershell
dotnet ef database update --project src\TravelWise.Api
```

## Important difference

- **Database password / PostgreSQL connection string:** used by the C# API.
- **Project URL and anon key:** used by client-side Supabase Auth/Storage.
- **Service-role key:** server-only secret. Never put it in React or Flutter.

The project Supabase URL is:

```text
https://fhnttrinouhhkjmmvydr.supabase.co
```

The URL alone is not enough to connect PostgreSQL. The C# API uses the private
Postgres connection string in `appsettings.Local.json`. Supabase Auth and
Storage integration will use the project URL and anon key in a later client
configuration step; never place the service-role key in a client app.
