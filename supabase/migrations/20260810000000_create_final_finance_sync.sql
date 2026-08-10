-- NOVA final batch sync schema: personal finance user state only.
-- This migration is intentionally not executed automatically.
-- Static UI labels, calculated summaries, filters and form drafts remain local.

create table if not exists public.bookkeeping_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  record_type text not null,
  amount numeric(20, 4) not null,
  category_local_id text not null,
  account_local_id text not null,
  record_date date not null,
  record_time time not null default '12:00',
  note text not null default '',
  source_storage_key text not null default 'nova:bookkeeping:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookkeeping_record_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint bookkeeping_record_type_check check (record_type in ('income', 'expense')),
  constraint bookkeeping_record_amount_check check (amount >= 0),
  constraint bookkeeping_record_category_check check (length(trim(category_local_id)) > 0),
  constraint bookkeeping_record_account_check check (length(trim(account_local_id)) > 0),
  constraint bookkeeping_record_version_check check (version > 0),
  unique (user_id, local_id)
);

create table if not exists public.bookkeeping_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  category_type text not null,
  name text not null,
  icon text not null default '•',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  source_storage_key text not null default 'nova:bookkeeping-category:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookkeeping_category_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint bookkeeping_category_type_check check (category_type in ('income', 'expense')),
  constraint bookkeeping_category_name_not_blank check (length(trim(name)) > 0),
  constraint bookkeeping_category_sort_check check (sort_order >= 0),
  constraint bookkeeping_category_version_check check (version > 0),
  unique (user_id, local_id)
);

create table if not exists public.bookkeeping_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  account_type text not null,
  name text not null,
  opening_balance numeric(20, 4) not null default 0,
  is_active boolean not null default true,
  source_storage_key text not null default 'nova:bookkeeping-account:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookkeeping_account_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint bookkeeping_account_type_check check (account_type in ('cash', 'bank', 'credit', 'wallet', 'other')),
  constraint bookkeeping_account_name_not_blank check (length(trim(name)) > 0),
  constraint bookkeeping_account_version_check check (version > 0),
  unique (user_id, local_id)
);

create table if not exists public.bookkeeping_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  budget_month text not null,
  amount numeric(20, 4) not null,
  category_local_id text,
  is_active boolean not null default true,
  source_storage_key text not null default 'nova:bookkeeping-budget:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookkeeping_budget_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint bookkeeping_budget_month_check check (budget_month ~ '^[0-9]{4}-[0-9]{2}$'),
  constraint bookkeeping_budget_amount_check check (amount >= 0),
  constraint bookkeeping_budget_category_check check (category_local_id is null or length(trim(category_local_id)) > 0),
  constraint bookkeeping_budget_version_check check (version > 0),
  unique (user_id, local_id)
);

-- Prevent two devices from associating a finance row with another user's device.
create or replace function public.validate_bookkeeping_source_device()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_device_id is not null
     and not exists (
       select 1
       from public.devices
       where id = new.source_device_id
         and user_id = new.user_id
     ) then
    raise exception 'source_device_id does not belong to user_id';
  end if;
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'bookkeeping_records',
    'bookkeeping_categories',
    'bookkeeping_accounts',
    'bookkeeping_budgets'
  ] loop
    execute format('drop trigger if exists %1$s_validate_source_device on public.%1$I', target_table);
    execute format('create trigger %1$s_validate_source_device before insert or update on public.%1$I for each row execute function public.validate_bookkeeping_source_device()', target_table);
    execute format('drop trigger if exists %1$s_set_updated_at on public.%1$I', target_table);
    execute format('create trigger %1$s_set_updated_at before update on public.%1$I for each row execute function public.set_updated_at()', target_table);
  end loop;
end;
$$;

-- A NULL category means the single whole-month budget. Partial unique indexes
-- make the NULL rule explicit and allow a deleted budget to be recreated.
drop index if exists public.bookkeeping_budgets_user_period_idx;
create unique index if not exists bookkeeping_budgets_user_total_active_idx
  on public.bookkeeping_budgets (user_id, budget_month)
  where category_local_id is null and deleted_at is null;
create unique index if not exists bookkeeping_budgets_user_category_active_idx
  on public.bookkeeping_budgets (user_id, budget_month, category_local_id)
  where category_local_id is not null and deleted_at is null;
create index if not exists bookkeeping_records_user_date_idx
  on public.bookkeeping_records (user_id, record_date desc, deleted_at);
create index if not exists bookkeeping_records_user_updated_idx
  on public.bookkeeping_records (user_id, client_updated_at desc, deleted_at);
create index if not exists bookkeeping_records_user_category_idx
  on public.bookkeeping_records (user_id, category_local_id, record_date desc);
create index if not exists bookkeeping_records_user_account_idx
  on public.bookkeeping_records (user_id, account_local_id, record_date desc);
create index if not exists bookkeeping_categories_user_updated_idx
  on public.bookkeeping_categories (user_id, client_updated_at desc, deleted_at);
create index if not exists bookkeeping_accounts_user_updated_idx
  on public.bookkeeping_accounts (user_id, client_updated_at desc, deleted_at);
create index if not exists bookkeeping_budgets_user_updated_idx
  on public.bookkeeping_budgets (user_id, client_updated_at desc, deleted_at);

alter table public.bookkeeping_records enable row level security;
alter table public.bookkeeping_categories enable row level security;
alter table public.bookkeeping_accounts enable row level security;
alter table public.bookkeeping_budgets enable row level security;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'bookkeeping_records',
    'bookkeeping_categories',
    'bookkeeping_accounts',
    'bookkeeping_budgets'
  ] loop
    execute format('drop policy if exists "Users can read own %1$s" on public.%1$I', target_table);
    execute format('create policy "Users can read own %1$s" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', target_table);
    execute format('drop policy if exists "Users can insert own %1$s" on public.%1$I', target_table);
    execute format('create policy "Users can insert own %1$s" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', target_table);
    execute format('drop policy if exists "Users can update own %1$s" on public.%1$I', target_table);
    execute format('create policy "Users can update own %1$s" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', target_table);
    execute format('drop policy if exists "Users can delete own %1$s" on public.%1$I', target_table);
    execute format('create policy "Users can delete own %1$s" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', target_table);
    execute format('revoke all on public.%1$I from anon', target_table);
    execute format('grant select, insert, update, delete on public.%1$I to authenticated', target_table);
  end loop;
end;
$$;
