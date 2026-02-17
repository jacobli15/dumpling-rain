-- Leaderboard table for Dumpling Rain
-- Run this in Supabase Dashboard: SQL Editor → New query → paste → Run

create table if not exists public.leaderboard (
  id uuid primary key default gen_random_uuid(),
  player_name text not null,
  score int not null,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.leaderboard enable row level security;

-- Anyone can read (anon key)
create policy "Allow public read"
  on public.leaderboard
  for select
  using (true);

-- Anyone can insert (no auth; for kids)
create policy "Allow public insert"
  on public.leaderboard
  for insert
  with check (true);
