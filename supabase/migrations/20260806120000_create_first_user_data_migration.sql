-- NOVA first user-data migration: collection and lightweight status snapshots only.
-- Existing module Local Storage remains the source of truth in this phase.

create table if not exists public.user_data_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module text not null,
  item_type text not null,
  entity_id text not null,
  state text not null,
  payload jsonb not null default '{}'::jsonb,
  source_storage_key text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  version integer not null default 1,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_data_items_module_check check (module in ('movies-tv', 'food', 'news', 'trend-life')),
  constraint user_data_items_type_check check (item_type in ('favorite', 'status')),
  constraint user_data_items_state_check check (state in ('favorite', 'completed', 'want', 'visited')),
  constraint user_data_items_entity_not_blank check (length(trim(entity_id)) > 0),
  constraint user_data_items_version_check check (version > 0),
  unique (user_id, module, item_type, entity_id)
);

create table if not exists public.user_migration_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  migration_key text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  status text not null default 'started',
  item_count integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_migration_runs_status_check check (status in ('started', 'completed', 'failed')),
  constraint user_migration_runs_count_check check (item_count >= 0),
  unique (user_id, migration_key, source_device_id)
);

create index if not exists user_data_items_user_module_idx on public.user_data_items (user_id, module, updated_at desc);
create index if not exists user_data_items_user_state_idx on public.user_data_items (user_id, state);
create index if not exists user_migration_runs_user_key_idx on public.user_migration_runs (user_id, migration_key, updated_at desc);

drop trigger if exists user_data_items_set_updated_at on public.user_data_items;
create trigger user_data_items_set_updated_at
before update on public.user_data_items
for each row execute function public.set_updated_at();

drop trigger if exists user_migration_runs_set_updated_at on public.user_migration_runs;
create trigger user_migration_runs_set_updated_at
before update on public.user_migration_runs
for each row execute function public.set_updated_at();

alter table public.user_data_items enable row level security;
alter table public.user_migration_runs enable row level security;

drop policy if exists "Users can read own data items" on public.user_data_items;
create policy "Users can read own data items"
on public.user_data_items for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own data items" on public.user_data_items;
create policy "Users can insert own data items"
on public.user_data_items for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own data items" on public.user_data_items;
create policy "Users can update own data items"
on public.user_data_items for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own data items" on public.user_data_items;
create policy "Users can delete own data items"
on public.user_data_items for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own migration runs" on public.user_migration_runs;
create policy "Users can read own migration runs"
on public.user_migration_runs for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own migration runs" on public.user_migration_runs;
create policy "Users can insert own migration runs"
on public.user_migration_runs for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own migration runs" on public.user_migration_runs;
create policy "Users can update own migration runs"
on public.user_migration_runs for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.user_data_items from anon;
revoke all on public.user_migration_runs from anon;
grant select, insert, update, delete on public.user_data_items to authenticated;
grant select, insert, update on public.user_migration_runs to authenticated;
