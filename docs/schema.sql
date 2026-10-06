-- Supabase/PostgreSQL baseline. Run EF Core migrations for the authoritative schema.
create table if not exists trips (
  id uuid primary key,
  name varchar(160) not null,
  destination varchar(160) not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint trip_dates_valid check (end_date >= start_date)
);
create index if not exists ix_trips_destination on trips(destination);

create table if not exists workflows (
  id uuid primary key,
  trip_id uuid not null references trips(id),
  objective varchar(1000) not null,
  status varchar(40) not null,
  plan_json jsonb,
  result_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ix_workflows_status on workflows(status);

create table if not exists audit_logs (
  id uuid primary key,
  workflow_id uuid not null references workflows(id),
  event_type varchar(80) not null,
  details text not null,
  created_at timestamptz not null default now()
);
