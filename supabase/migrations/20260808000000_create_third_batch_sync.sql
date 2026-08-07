-- NOVA third batch sync schema: English learning and AI speaking.
-- This migration is intentionally not executed automatically.
-- Static English words, recommendations, speaking scenarios, and speech APIs remain local assets.

create table if not exists public.english_learning_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null default 'settings',
  source_device_id uuid references public.devices(id) on delete set null,
  daily_word_count integer not null default 10,
  accent text not null default 'us',
  source_storage_key text not null default 'nova:english-learning:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint english_settings_local_id_check check (local_id = 'settings'),
  constraint english_settings_daily_count_check check (daily_word_count between 5 and 30),
  constraint english_settings_accent_check check (accent in ('us', 'uk', 'any')),
  constraint english_settings_version_check check (version > 0),
  unique (user_id, local_id)
);

create table if not exists public.english_word_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  word_id text not null,
  status text not null default 'unknown',
  first_learned_at timestamptz,
  last_learned_at timestamptz,
  next_review_at timestamptz,
  review_count integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  is_favorite boolean not null default false,
  is_in_vocabulary_book boolean not null default false,
  source_storage_key text not null default 'nova:english-learning:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint english_progress_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint english_progress_word_id_not_blank check (length(trim(word_id)) > 0),
  constraint english_progress_status_check check (status in ('unknown', 'fuzzy', 'known', 'mastered')),
  constraint english_progress_counts_check check (review_count >= 0 and correct_count >= 0 and wrong_count >= 0),
  constraint english_progress_version_check check (version > 0),
  unique (user_id, local_id),
  unique (user_id, word_id)
);

create table if not exists public.english_daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  plan_date date not null,
  word_ids jsonb not null default '[]'::jsonb,
  completed_word_ids jsonb not null default '[]'::jsonb,
  reviewed_word_ids jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  source_storage_key text not null default 'nova:english-learning:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint english_plan_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint english_plan_arrays_check check (
    jsonb_typeof(word_ids) = 'array'
    and jsonb_typeof(completed_word_ids) = 'array'
    and jsonb_typeof(reviewed_word_ids) = 'array'
  ),
  constraint english_plan_version_check check (version > 0),
  unique (user_id, local_id),
  unique (user_id, plan_date)
);

create table if not exists public.english_learning_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  record_date date not null,
  learned_count integer not null default 0,
  mastered_count integer not null default 0,
  reviewed_count integer not null default 0,
  correct_rate numeric(5, 2) not null default 0,
  duration_minutes integer not null default 0,
  target_completed boolean not null default false,
  source_storage_key text not null default 'nova:english-learning:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint english_record_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint english_record_counts_check check (learned_count >= 0 and mastered_count >= 0 and reviewed_count >= 0 and duration_minutes >= 0),
  constraint english_record_rate_check check (correct_rate between 0 and 100),
  constraint english_record_version_check check (version > 0),
  unique (user_id, local_id),
  unique (user_id, record_date)
);

create table if not exists public.english_recommendation_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  recommendation_id text not null,
  is_favorite boolean not null default false,
  is_watched boolean not null default false,
  last_shown_at timestamptz,
  source_storage_key text not null default 'nova:english-learning:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint english_recommendation_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint english_recommendation_id_not_blank check (length(trim(recommendation_id)) > 0),
  constraint english_recommendation_version_check check (version > 0),
  unique (user_id, local_id),
  unique (user_id, recommendation_id)
);

create table if not exists public.speaking_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null default 'settings',
  source_device_id uuid references public.devices(id) on delete set null,
  level text not null default 'beginner',
  accent text not null default 'us',
  response_speed text not null default 'normal',
  show_translation boolean not null default true,
  auto_read boolean not null default false,
  daily_goal_minutes integer not null default 10,
  show_feedback boolean not null default true,
  source_storage_key text not null default 'nova:speaking:settings:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_settings_local_id_check check (local_id = 'settings'),
  constraint speaking_settings_level_check check (level in ('beginner', 'intermediate', 'advanced')),
  constraint speaking_settings_accent_check check (accent in ('us', 'uk')),
  constraint speaking_settings_speed_check check (response_speed in ('slow', 'normal')),
  constraint speaking_settings_goal_check check (daily_goal_minutes in (5, 10, 15, 20)),
  constraint speaking_settings_version_check check (version > 0),
  unique (user_id, local_id)
);

create table if not exists public.speaking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  session_date date not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  scenario_id text not null,
  scenario_title text not null,
  difficulty text not null,
  turn_count integer not null default 0,
  user_messages jsonb not null default '[]'::jsonb,
  ai_messages jsonb not null default '[]'::jsonb,
  feedback jsonb not null default '[]'::jsonb,
  saved_expression_ids jsonb not null default '[]'::jsonb,
  duration_seconds integer not null default 0,
  summary_level text not null,
  improvement text not null default '',
  source_storage_key text not null default 'nova:speaking:sessions:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_session_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint speaking_session_scenario_id_not_blank check (length(trim(scenario_id)) > 0),
  constraint speaking_session_difficulty_check check (difficulty in ('beginner', 'intermediate', 'advanced')),
  constraint speaking_session_counts_check check (turn_count >= 0 and duration_seconds >= 0),
  constraint speaking_session_json_check check (
    jsonb_typeof(user_messages) = 'array'
    and jsonb_typeof(ai_messages) = 'array'
    and jsonb_typeof(feedback) = 'array'
    and jsonb_typeof(saved_expression_ids) = 'array'
  ),
  constraint speaking_session_summary_check check (summary_level in ('needs-practice', 'clear', 'natural', 'fluent')),
  constraint speaking_session_version_check check (version > 0),
  unique (user_id, local_id)
);

create table if not exists public.speaking_expressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null,
  source_device_id uuid references public.devices(id) on delete set null,
  expression text not null,
  explanation text not null default '',
  scenario_id text not null,
  scenario_title text not null,
  source_date date not null,
  original_text text not null default '',
  saved_at timestamptz not null,
  source_storage_key text not null default 'nova:speaking:expressions:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_expression_local_id_not_blank check (length(trim(local_id)) > 0),
  constraint speaking_expression_text_not_blank check (length(trim(expression)) > 0),
  constraint speaking_expression_scenario_id_not_blank check (length(trim(scenario_id)) > 0),
  constraint speaking_expression_version_check check (version > 0),
  unique (user_id, local_id)
);

create table if not exists public.speaking_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_id text not null default 'active',
  source_device_id uuid references public.devices(id) on delete set null,
  scenario_id text not null,
  started_at timestamptz not null,
  messages jsonb not null default '[]'::jsonb,
  hint_level integer not null default 0,
  source_storage_key text not null default 'nova:speaking:draft:v1',
  version integer not null default 1,
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint speaking_draft_local_id_check check (local_id = 'active'),
  constraint speaking_draft_scenario_id_not_blank check (length(trim(scenario_id)) > 0),
  constraint speaking_draft_messages_check check (jsonb_typeof(messages) = 'array'),
  constraint speaking_draft_hint_check check (hint_level >= 0),
  constraint speaking_draft_version_check check (version > 0),
  unique (user_id, local_id)
);

create index if not exists english_progress_user_review_idx
  on public.english_word_progress (user_id, next_review_at, deleted_at);
create index if not exists english_progress_user_updated_idx
  on public.english_word_progress (user_id, client_updated_at desc);
create index if not exists english_plans_user_date_idx
  on public.english_daily_plans (user_id, plan_date desc, deleted_at);
create index if not exists english_records_user_date_idx
  on public.english_learning_records (user_id, record_date desc, deleted_at);
create index if not exists english_recommendations_user_updated_idx
  on public.english_recommendation_states (user_id, client_updated_at desc);
create index if not exists speaking_sessions_user_date_idx
  on public.speaking_sessions (user_id, session_date desc, deleted_at);
create index if not exists speaking_sessions_user_updated_idx
  on public.speaking_sessions (user_id, client_updated_at desc);
create index if not exists speaking_expressions_user_date_idx
  on public.speaking_expressions (user_id, source_date desc, deleted_at);

drop trigger if exists english_settings_set_updated_at on public.english_learning_settings;
create trigger english_settings_set_updated_at before update on public.english_learning_settings
for each row execute function public.set_updated_at();
drop trigger if exists english_progress_set_updated_at on public.english_word_progress;
create trigger english_progress_set_updated_at before update on public.english_word_progress
for each row execute function public.set_updated_at();
drop trigger if exists english_plans_set_updated_at on public.english_daily_plans;
create trigger english_plans_set_updated_at before update on public.english_daily_plans
for each row execute function public.set_updated_at();
drop trigger if exists english_records_set_updated_at on public.english_learning_records;
create trigger english_records_set_updated_at before update on public.english_learning_records
for each row execute function public.set_updated_at();
drop trigger if exists english_recommendations_set_updated_at on public.english_recommendation_states;
create trigger english_recommendations_set_updated_at before update on public.english_recommendation_states
for each row execute function public.set_updated_at();
drop trigger if exists speaking_settings_set_updated_at on public.speaking_settings;
create trigger speaking_settings_set_updated_at before update on public.speaking_settings
for each row execute function public.set_updated_at();
drop trigger if exists speaking_sessions_set_updated_at on public.speaking_sessions;
create trigger speaking_sessions_set_updated_at before update on public.speaking_sessions
for each row execute function public.set_updated_at();
drop trigger if exists speaking_expressions_set_updated_at on public.speaking_expressions;
create trigger speaking_expressions_set_updated_at before update on public.speaking_expressions
for each row execute function public.set_updated_at();
drop trigger if exists speaking_drafts_set_updated_at on public.speaking_drafts;
create trigger speaking_drafts_set_updated_at before update on public.speaking_drafts
for each row execute function public.set_updated_at();

alter table public.english_learning_settings enable row level security;
alter table public.english_word_progress enable row level security;
alter table public.english_daily_plans enable row level security;
alter table public.english_learning_records enable row level security;
alter table public.english_recommendation_states enable row level security;
alter table public.speaking_settings enable row level security;
alter table public.speaking_sessions enable row level security;
alter table public.speaking_expressions enable row level security;
alter table public.speaking_drafts enable row level security;

-- Every policy below isolates rows by the authenticated Supabase user.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'english_learning_settings',
    'english_word_progress',
    'english_daily_plans',
    'english_learning_records',
    'english_recommendation_states',
    'speaking_settings',
    'speaking_sessions',
    'speaking_expressions',
    'speaking_drafts'
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
