-- NOVA second batch sync schema: today's plan and exercise check-ins.
-- This migration is intentionally not executed automatically.
-- Local Storage remains the local-first source of truth until the sync layer is implemented.

create table if not exists public.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  title text not null,
  task_date date not null,
  task_time time,
  priority text not null default 'medium',
  category text not null default '其他',
  notes text not null default '',
  completed boolean not null default false,
  completed_at timestamptz,
  source_storage_key text not null default 'nova:today-tasks:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_tasks_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint plan_tasks_title_not_blank check (length(trim(title)) > 0),
  constraint plan_tasks_priority_check check (priority in ('low', 'medium', 'high')),
  constraint plan_tasks_version_check check (version > 0),
  unique (user_id, local_id)
);

create table if not exists public.exercise_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  name text not null,
  icon text not null default '✓',
  sort_order integer not null default 0,
  is_favorite boolean not null default false,
  is_active boolean not null default true,
  source_storage_key text not null default 'nova:exercise:types:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_types_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint exercise_types_name_not_blank check (length(trim(name)) > 0),
  constraint exercise_types_version_check check (version > 0),
  unique (user_id, local_id)
);

create table if not exists public.exercise_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  type_local_id text not null,
  exercise_date date not null,
  start_time time,
  duration_minutes integer,
  location text,
  intensity text,
  feeling text,
  note text,
  image_url text,
  source_storage_key text not null default 'nova:exercise:records:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercise_records_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint exercise_records_type_local_id_not_blank check (length(trim(type_local_id)) > 0),
  constraint exercise_records_duration_check check (duration_minutes is null or duration_minutes between 0 and 1440),
  constraint exercise_records_intensity_check check (intensity is null or intensity in ('easy', 'moderate', 'high')),
  constraint exercise_records_feeling_check check (feeling is null or feeling in ('great', 'normal', 'tired')),
  constraint exercise_records_version_check check (version > 0),
  unique (user_id, local_id)
);

create index if not exists plan_tasks_user_date_idx
  on public.plan_tasks (user_id, task_date, deleted_at, client_updated_at desc);
create index if not exists plan_tasks_user_updated_idx
  on public.plan_tasks (user_id, client_updated_at desc);
create index if not exists exercise_types_user_updated_idx
  on public.exercise_types (user_id, client_updated_at desc);
create index if not exists exercise_records_user_date_idx
  on public.exercise_records (user_id, exercise_date desc, deleted_at);
create index if not exists exercise_records_user_updated_idx
  on public.exercise_records (user_id, client_updated_at desc);

drop trigger if exists plan_tasks_set_updated_at on public.plan_tasks;
create trigger plan_tasks_set_updated_at
before update on public.plan_tasks
for each row execute function public.set_updated_at();

drop trigger if exists exercise_types_set_updated_at on public.exercise_types;
create trigger exercise_types_set_updated_at
before update on public.exercise_types
for each row execute function public.set_updated_at();

drop trigger if exists exercise_records_set_updated_at on public.exercise_records;
create trigger exercise_records_set_updated_at
before update on public.exercise_records
for each row execute function public.set_updated_at();

alter table public.plan_tasks enable row level security;
alter table public.exercise_types enable row level security;
alter table public.exercise_records enable row level security;

drop policy if exists "Users can read own plan tasks" on public.plan_tasks;
create policy "Users can read own plan tasks"
on public.plan_tasks for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own plan tasks" on public.plan_tasks;
create policy "Users can insert own plan tasks"
on public.plan_tasks for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own plan tasks" on public.plan_tasks;
create policy "Users can update own plan tasks"
on public.plan_tasks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own plan tasks" on public.plan_tasks;
create policy "Users can delete own plan tasks"
on public.plan_tasks for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own exercise types" on public.exercise_types;
create policy "Users can read own exercise types"
on public.exercise_types for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own exercise types" on public.exercise_types;
create policy "Users can insert own exercise types"
on public.exercise_types for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own exercise types" on public.exercise_types;
create policy "Users can update own exercise types"
on public.exercise_types for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own exercise types" on public.exercise_types;
create policy "Users can delete own exercise types"
on public.exercise_types for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own exercise records" on public.exercise_records;
create policy "Users can read own exercise records"
on public.exercise_records for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own exercise records" on public.exercise_records;
create policy "Users can insert own exercise records"
on public.exercise_records for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own exercise records" on public.exercise_records;
create policy "Users can update own exercise records"
on public.exercise_records for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own exercise records" on public.exercise_records;
create policy "Users can delete own exercise records"
on public.exercise_records for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.plan_tasks from anon;
revoke all on public.exercise_types from anon;
revoke all on public.exercise_records from anon;
grant select, insert, update, delete on public.plan_tasks to authenticated;
grant select, insert, update, delete on public.exercise_types to authenticated;
grant select, insert, update, delete on public.exercise_records to authenticated;
