-- NOVA fourth batch sync schema: finance learning user state only.
-- Static finance knowledge, briefs, quiz content, and coach replies remain local assets.
-- This migration is intentionally not executed automatically.

create table if not exists public.finance_learning_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null default 'settings',
  source_device_id uuid references public.devices(id) on delete set null,
  level text not null default 'beginner',
  goal text not null default 'daily-finance',
  daily_minutes integer not null default 15,
  show_brief boolean not null default true,
  practice_required boolean not null default true,
  risk_reminders boolean not null default true,
  preferred_category text not null default 'any',
  source_storage_key text not null default 'nova:finance:settings:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_settings_local_id_check check (local_id = 'settings'),
  constraint finance_settings_level_check check (level in ('beginner', 'intermediate', 'advanced')),
  constraint finance_settings_goal_check check (goal in ('daily-finance', 'exam', 'career', 'long-term-planning')),
  constraint finance_settings_minutes_check check (daily_minutes between 5 and 60),
  constraint finance_settings_version_check check (version > 0),
  unique (user_id, local_id)
);

create table if not exists public.finance_daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  plan_date date not null,
  knowledge_ids jsonb not null default '[]'::jsonb,
  review_knowledge_ids jsonb not null default '[]'::jsonb,
  completed_knowledge_ids jsonb not null default '[]'::jsonb,
  completed_quiz_ids jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  source_storage_key text not null default 'nova:finance:daily:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_plan_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint finance_plan_arrays_check check (
    jsonb_typeof(knowledge_ids) = 'array'
    and jsonb_typeof(review_knowledge_ids) = 'array'
    and jsonb_typeof(completed_knowledge_ids) = 'array'
    and jsonb_typeof(completed_quiz_ids) = 'array'
  ),
  constraint finance_plan_version_check check (version > 0),
  unique (user_id, local_id),
  unique (user_id, plan_date)
);

create table if not exists public.finance_knowledge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  knowledge_id text not null,
  status text not null default 'not-started',
  first_learned_at timestamptz,
  last_studied_at timestamptz,
  next_review_at date,
  review_count integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  completed_count integer not null default 0,
  is_favorite boolean not null default false,
  source_storage_key text not null default 'nova:finance:daily:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_progress_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint finance_progress_knowledge_id_not_blank check (length(trim(knowledge_id)) > 0),
  constraint finance_progress_status_check check (status in ('not-started', 'learning', 'completed', 'mastered')),
  constraint finance_progress_counts_check check (review_count >= 0 and correct_count >= 0 and wrong_count >= 0 and completed_count >= 0),
  constraint finance_progress_version_check check (version > 0),
  unique (user_id, local_id),
  unique (user_id, knowledge_id)
);

create table if not exists public.finance_learning_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  record_date date not null,
  learned_count integer not null default 0,
  completed_count integer not null default 0,
  review_count integer not null default 0,
  correct_rate numeric(5, 2) not null default 0,
  study_minutes integer not null default 0,
  target_completed boolean not null default false,
  source_storage_key text not null default 'nova:finance:history:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_record_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint finance_record_counts_check check (learned_count >= 0 and completed_count >= 0 and review_count >= 0 and study_minutes >= 0),
  constraint finance_record_rate_check check (correct_rate between 0 and 100),
  constraint finance_record_version_check check (version > 0),
  unique (user_id, local_id),
  unique (user_id, record_date)
);

create table if not exists public.finance_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  favorite_type text not null,
  item_title text not null,
  created_at_client timestamptz not null,
  source_storage_key text not null default 'nova:finance:favorites:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_favorite_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint finance_favorite_type_check check (favorite_type in ('knowledge', 'brief', 'coach')),
  constraint finance_favorite_title_not_blank check (length(trim(item_title)) > 0),
  constraint finance_favorite_version_check check (version > 0),
  unique (user_id, local_id)
);

create table if not exists public.finance_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  reflection_date date not null,
  content text not null default '',
  reflection_updated_at timestamptz not null,
  source_storage_key text not null default 'nova:finance:reflections:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_reflection_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint finance_reflection_version_check check (version > 0),
  unique (user_id, local_id),
  unique (user_id, reflection_date)
);

create table if not exists public.finance_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  attempt_date date not null,
  knowledge_id text not null,
  question_id text not null,
  selected_answer text not null,
  is_correct boolean not null default false,
  source_storage_key text not null default 'nova:finance:quiz-attempts:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_attempt_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint finance_attempt_knowledge_id_not_blank check (length(trim(knowledge_id)) > 0),
  constraint finance_attempt_question_id_not_blank check (length(trim(question_id)) > 0),
  constraint finance_attempt_version_check check (version > 0),
  unique (user_id, local_id)
);

create index if not exists finance_progress_user_review_idx
  on public.finance_knowledge_progress (user_id, next_review_at, deleted_at);
create index if not exists finance_progress_user_updated_idx
  on public.finance_knowledge_progress (user_id, client_updated_at desc);
create index if not exists finance_plans_user_date_idx
  on public.finance_daily_plans (user_id, plan_date desc, deleted_at);
create index if not exists finance_records_user_date_idx
  on public.finance_learning_records (user_id, record_date desc, deleted_at);
create index if not exists finance_favorites_user_updated_idx
  on public.finance_favorites (user_id, client_updated_at desc, deleted_at);
create index if not exists finance_reflections_user_date_idx
  on public.finance_reflections (user_id, reflection_date desc, deleted_at);
create index if not exists finance_attempts_user_date_idx
  on public.finance_quiz_attempts (user_id, attempt_date desc, deleted_at);

drop trigger if exists finance_settings_set_updated_at on public.finance_learning_settings;
create trigger finance_settings_set_updated_at before update on public.finance_learning_settings
for each row execute function public.set_updated_at();
drop trigger if exists finance_plans_set_updated_at on public.finance_daily_plans;
create trigger finance_plans_set_updated_at before update on public.finance_daily_plans
for each row execute function public.set_updated_at();
drop trigger if exists finance_progress_set_updated_at on public.finance_knowledge_progress;
create trigger finance_progress_set_updated_at before update on public.finance_knowledge_progress
for each row execute function public.set_updated_at();
drop trigger if exists finance_records_set_updated_at on public.finance_learning_records;
create trigger finance_records_set_updated_at before update on public.finance_learning_records
for each row execute function public.set_updated_at();
drop trigger if exists finance_favorites_set_updated_at on public.finance_favorites;
create trigger finance_favorites_set_updated_at before update on public.finance_favorites
for each row execute function public.set_updated_at();
drop trigger if exists finance_reflections_set_updated_at on public.finance_reflections;
create trigger finance_reflections_set_updated_at before update on public.finance_reflections
for each row execute function public.set_updated_at();
drop trigger if exists finance_attempts_set_updated_at on public.finance_quiz_attempts;
create trigger finance_attempts_set_updated_at before update on public.finance_quiz_attempts
for each row execute function public.set_updated_at();

alter table public.finance_learning_settings enable row level security;
alter table public.finance_daily_plans enable row level security;
alter table public.finance_knowledge_progress enable row level security;
alter table public.finance_learning_records enable row level security;
alter table public.finance_favorites enable row level security;
alter table public.finance_reflections enable row level security;
alter table public.finance_quiz_attempts enable row level security;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'finance_learning_settings',
    'finance_daily_plans',
    'finance_knowledge_progress',
    'finance_learning_records',
    'finance_favorites',
    'finance_reflections',
    'finance_quiz_attempts'
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
