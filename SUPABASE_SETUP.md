# Supabase Leaderboard Setup Guide

## Current Status

✅ **Code is already configured correctly:**
- `src/lib/supabase.ts` - Initializes Supabase client from env vars
- `src/lib/leaderboard.ts` - API functions for fetching/submitting scores
- `src/game/Game.tsx` - UI wired up with leaderboard modal and save functionality

## What You Need to Do

### 1. Create Supabase Table

Run this SQL in your Supabase Dashboard (SQL Editor):

```sql
-- Leaderboard table for Dumpling Rain
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
```

**Location:** See `supabase/leaderboard-table.sql` in this repo.

### 2. Environment Variables

#### For Local Development (`.env` file)

Create/update `.env` in the project root:

```env
VITE_SUPABASE_URL=https://turofyiazpzzasecnngc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cm9meWlhenB6emFzZWNubmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMDg1MTIsImV4cCI6MjA4Njg4NDUxMn0.ipSk4xMLHj1SWiA1C23R9z4MeJE-GcgC9mAHr_zRcnA
```

**Important:** 
- `.env` is already in `.gitignore` (won't be committed)
- Restart dev server after creating/updating `.env`: `npm run dev`

#### For Netlify Deployment

1. Go to Netlify Dashboard → Your Site → **Site settings** → **Environment variables**
2. Add these two variables:

   **Variable 1:**
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://turofyiazpzzasecnngc.supabase.co`
   - Secret: ❌ Unchecked (URLs aren't secret)
   - Scopes: ✅ **All scopes**
   - Values: ✅ **Same value for all deploy contexts**

   **Variable 2:**
   - Key: `VITE_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1cm9meWlhenB6emFzZWNubmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMDg1MTIsImV4cCI6MjA4Njg4NDUxMn0.ipSk4xMLHj1SWiA1C23R9z4MeJE-GcgC9mAHr_zRcnA`
   - Secret: ✅ **Checked** (API keys should be secret)
   - Scopes: ✅ **All scopes**
   - Values: ✅ **Same value for all deploy contexts**

3. Click **"Relaunch to update"** to trigger a new deployment

### 3. Verify Setup

**Local:**
1. Check browser console (F12) - should see `[Supabase] Client initialized successfully`
2. Click "leaderboard" button - should show leaderboard (empty if no scores yet)
3. Play game, enter name on game over, click "Save to leaderboard" - should work

**Netlify:**
1. After redeploy completes, test the leaderboard button
2. Should work same as local

## Troubleshooting

**If you see "Leaderboard unavailable":**
1. ✅ Check `.env` file exists and has both variables (no extra spaces/newlines)
2. ✅ Restart dev server (`npm run dev`)
3. ✅ Check browser console for `[Supabase]` messages
4. ✅ Verify table exists in Supabase Dashboard → Table Editor
5. ✅ Verify RLS policies are enabled (Supabase Dashboard → Authentication → Policies)

**If Netlify still shows error:**
1. ✅ Verify env vars are set in Netlify Dashboard
2. ✅ Make sure "All scopes" is selected (not "Specific scopes")
3. ✅ Make sure "Same value for all deploy contexts" is selected
4. ✅ Click "Relaunch to update" after adding variables
5. ✅ Wait for deployment to complete

## Code Files (Already Done ✅)

- `src/lib/supabase.ts` - Supabase client initialization
- `src/lib/leaderboard.ts` - Leaderboard API functions
- `src/game/Game.tsx` - UI integration
- `.env.example` - Template (no real keys)
- `.gitignore` - Includes `.env`

No code changes needed - everything is already implemented!
