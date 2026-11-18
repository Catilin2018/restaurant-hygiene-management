-- Daily Cleaning Log (Shaking Tang Management)
-- Run this whole file once in the Supabase SQL Editor: Project -> SQL Editor -> New query -> Paste -> Run.
-- It creates the tables, opens access for the anon/public key used by the static web page,
-- and seeds the task list copied from the original Excel sheet.

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

create table if not exists public.cleaning_tasks (
  id text primary key,
  section text not null check (section in ('daily', 'weekly', 'special')),
  label text not null,
  sort_order integer not null default 0,
  signoff_after boolean not null default false
);

create table if not exists public.cleaning_checks (
  id bigint generated always as identity primary key,
  month date not null,
  task_id text not null references public.cleaning_tasks(id) on delete cascade,
  day smallint not null check (day between 1 and 31),
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint cleaning_checks_unique unique (month, task_id, day)
);

create table if not exists public.cleaning_signoffs (
  id bigint generated always as identity primary key,
  month date not null,
  scope text not null,
  week smallint not null check (week between 1 and 5),
  signed_by text,
  signed_at timestamptz,
  constraint cleaning_signoffs_unique unique (month, scope, week)
);

create table if not exists public.staff_totals (
  id bigint generated always as identity primary key,
  block smallint not null check (block in (1, 2)),
  work_date date not null,
  name text not null,
  total numeric(10, 2),
  updated_at timestamptz not null default now(),
  constraint staff_totals_unique unique (block, work_date, name)
);

create index if not exists cleaning_checks_month_idx on public.cleaning_checks (month);
create index if not exists cleaning_signoffs_month_idx on public.cleaning_signoffs (month);
create index if not exists staff_totals_date_idx on public.staff_totals (work_date);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security
-- The web page is static, so it uses the anon/public key. These policies let
-- that key read and write this app's data. Anyone with the URL + anon key can
-- edit records, so keep the link internal. Do NOT put a service-role key here.
-- ---------------------------------------------------------------------------

alter table public.cleaning_tasks enable row level security;
alter table public.cleaning_checks enable row level security;
alter table public.cleaning_signoffs enable row level security;
alter table public.staff_totals enable row level security;

drop policy if exists "public access cleaning_tasks" on public.cleaning_tasks;
create policy "public access cleaning_tasks" on public.cleaning_tasks
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "public access cleaning_checks" on public.cleaning_checks;
create policy "public access cleaning_checks" on public.cleaning_checks
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "public access cleaning_signoffs" on public.cleaning_signoffs;
create policy "public access cleaning_signoffs" on public.cleaning_signoffs
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "public access staff_totals" on public.staff_totals;
create policy "public access staff_totals" on public.staff_totals
  for all to anon, authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 3. Task list from the Excel sheet (original wording kept as written)
-- ---------------------------------------------------------------------------

insert into public.cleaning_tasks (id, section, label, sort_order, signoff_after) values
  ('d01', 'daily', 'Wash up Dishes', 1, false),
  ('d02', 'daily', 'Wash up area sinks, shelves...', 2, false),
  ('d03', 'daily', 'Wash up Bain Marle containers', 3, false),
  ('d04', 'daily', 'Wash up and clean wash mach', 4, false),
  ('d05', 'daily', 'Bins (remove bags and clean)', 5, false),
  ('d06', 'daily', 'Cold Room, Broom and Mop', 6, false),
  ('d07', 'daily', 'Broom and mop kitchen', 7, false),
  ('d08', 'daily', 'Broom and mop Stairs', 8, false),
  ('d09', 'daily', 'Clean the shelves Sink area', 9, false),
  ('d10', 'daily', 'Clean the shelves Rice area', 10, false),
  ('d11', 'daily', 'Clean the shelves Fryers area', 11, false),
  ('d12', 'daily', 'Clean the Tables Fryer area', 12, false),
  ('d13', 'daily', 'Clean the Tables Cocking area', 13, false),
  ('d14', 'daily', 'Clean the Toilet floor', 14, true),
  ('w01', 'weekly', 'Deep clean Shelves Rice area', 101, false),
  ('w02', 'weekly', 'Deep clean Shelves Sinks area', 102, false),
  ('w03', 'weekly', 'Deep clean Shelves Fryer area', 103, false),
  ('w04', 'weekly', 'Deep clean Table Fryer area', 104, false),
  ('w05', 'weekly', 'Deep clean Table Cocking area', 105, true),
  ('s01', 'special', 'Clean the freezer', 201, true),
  ('s02', 'special', 'Scrath around doors and tables legs', 202, true),
  ('s03', 'special', 'Clean the walls areas 1, 2, 3 and 4', 203, true)
on conflict (id) do update set
  section = excluded.section,
  label = excluded.label,
  sort_order = excluded.sort_order,
  signoff_after = excluded.signoff_after;

-- Done. Open the web page, enter Project URL + anon key in Settings.
