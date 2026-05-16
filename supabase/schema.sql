-- Klocka Supabase schema. Kör i Supabase SQL editor.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  avatar_emoji text default '🙂',
  created_at timestamptz default now()
);

create table if not exists clock_events (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  timestamp timestamptz not null,
  note text
);

create table if not exists sessions (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  clocked_minutes numeric not null,
  active_minutes numeric not null,
  work_minutes numeric not null,
  fun_minutes numeric not null,
  focus_factor numeric not null,
  final_score int not null,
  note text
);

create table if not exists activity_samples (
  id bigserial primary key,
  session_id text references sessions(id) on delete cascade,
  user_id uuid not null,
  timestamp timestamptz not null,
  active_app text,
  active_title text,
  category text check (category in ('work','communication','fun','unknown')),
  keystrokes int default 0,
  mouse_clicks int default 0,
  is_idle boolean default false
);

create table if not exists screenshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  taken_at timestamptz not null,
  storage_path text not null,
  approved_by_user boolean default false,
  blurred boolean default false,
  uploaded_at timestamptz
);

create table if not exists weekly_plans (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  week_start date not null,
  goals jsonb not null,
  submitted_at timestamptz default now(),
  unique (user_id, week_start)
);

create table if not exists weekly_deliveries (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  week_start date not null,
  delivered jsonb not null,
  presentation_path text,
  submitted_at timestamptz default now(),
  unique (user_id, week_start)
);

create table if not exists slacker_awards (
  id bigserial primary key,
  week_start date not null,
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  emoji text not null,
  roast text,
  created_at timestamptz default now()
);

alter table users enable row level security;
alter table clock_events enable row level security;
alter table sessions enable row level security;
alter table activity_samples enable row level security;
alter table screenshots enable row level security;
alter table weekly_plans enable row level security;
alter table weekly_deliveries enable row level security;
alter table slacker_awards enable row level security;

create policy "team_read_all" on users for select using (auth.role() = 'authenticated');
create policy "team_read_all" on sessions for select using (auth.role() = 'authenticated');
create policy "team_read_all" on clock_events for select using (auth.role() = 'authenticated');
create policy "team_read_all" on weekly_plans for select using (auth.role() = 'authenticated');
create policy "team_read_all" on weekly_deliveries for select using (auth.role() = 'authenticated');
create policy "team_read_all" on slacker_awards for select using (auth.role() = 'authenticated');

create policy "own_insert" on clock_events for insert with check (auth.uid() = user_id);
create policy "own_insert" on sessions for insert with check (auth.uid() = user_id);
create policy "own_insert" on activity_samples for insert with check (auth.uid() = user_id);
create policy "own_insert" on screenshots for insert with check (auth.uid() = user_id);
create policy "own_insert" on weekly_plans for insert with check (auth.uid() = user_id);
create policy "own_insert" on weekly_deliveries for insert with check (auth.uid() = user_id);
