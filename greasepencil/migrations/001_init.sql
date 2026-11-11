create table if not exists vehicles (
  id text primary key,
  owner_id text not null,
  nickname text not null,
  make text not null,
  model text not null,
  year integer not null,
  chassis_code text,
  engine_code text,
  vin text,
  plate text,
  fuel text,
  mileage integer not null,
  mileage_unit text not null default 'km',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicles_owner_idx on vehicles (owner_id);

create table if not exists intervals (
  id text primary key,
  owner_id text not null,
  vehicle_id text not null references vehicles (id) on delete cascade,
  title text not null,
  category text not null,
  interval_distance integer,
  interval_months integer,
  last_mileage integer,
  last_performed_on date,
  part_number text,
  part_name text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists intervals_owner_vehicle_idx on intervals (owner_id, vehicle_id);

create table if not exists parts (
  id text primary key,
  owner_id text not null,
  vehicle_id text references vehicles (id) on delete set null,
  name text not null,
  part_number text not null,
  brand text,
  category text not null,
  specification text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists parts_owner_idx on parts (owner_id);

create table if not exists service_logs (
  id text primary key,
  owner_id text not null,
  vehicle_id text not null references vehicles (id) on delete cascade,
  interval_id text references intervals (id) on delete set null,
  performed_on date not null,
  mileage integer not null,
  title text not null,
  summary text not null default '',
  performer text not null,
  labor_cents integer not null default 0,
  parts_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists service_logs_owner_vehicle_idx on service_logs (owner_id, vehicle_id);

create table if not exists service_log_parts (
  id text primary key,
  owner_id text not null,
  log_id text not null references service_logs (id) on delete cascade,
  name text not null,
  part_number text,
  quantity numeric not null,
  unit_price_cents integer not null default 0
);

create index if not exists service_log_parts_log_idx on service_log_parts (log_id);

create table if not exists owner_settings (
  owner_id text primary key,
  sample_loaded boolean not null default false
);
