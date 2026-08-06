-- NOVA Supabase foundation: identity-linked profile and device metadata only.
-- All timestamps use timestamptz; PostgreSQL stores these values in UTC.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  timezone text not null default 'Asia/Shanghai',
  language text not null default 'zh-CN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_not_blank check (length(trim(timezone)) > 0),
  constraint profiles_language_not_blank check (length(trim(language)) > 0)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null,
  device_type text not null default 'unknown',
  platform text not null default 'unknown',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_name_not_blank check (length(trim(device_name)) > 0),
  constraint devices_type_not_blank check (length(trim(device_type)) > 0),
  constraint devices_platform_not_blank check (length(trim(platform)) > 0)
);

create index if not exists devices_user_id_idx on public.devices (user_id);
create index if not exists devices_last_seen_at_idx on public.devices (user_id, last_seen_at desc nulls last);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists devices_set_updated_at on public.devices;
create trigger devices_set_updated_at
before update on public.devices
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, timezone, language)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'Asia/Shanghai'),
    coalesce(nullif(new.raw_user_meta_data ->> 'language', ''), 'zh-CN')
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Profile initialization must not roll back Auth user creation.
  raise warning 'NOVA profile initialization skipped';
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.devices enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can read own devices" on public.devices;
create policy "Users can read own devices"
on public.devices for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own devices" on public.devices;
create policy "Users can insert own devices"
on public.devices for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own devices" on public.devices;
create policy "Users can update own devices"
on public.devices for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own devices" on public.devices;
create policy "Users can delete own devices"
on public.devices for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.profiles from anon;
revoke all on public.devices from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.devices to authenticated;
