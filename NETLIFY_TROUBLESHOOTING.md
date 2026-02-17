# Netlify Troubleshooting Guide

## Current Issue: Leaderboard shows "unavailable" in production

### Step 1: Check Browser Console

1. Open your production site: `astounding-zabaione-9aecd1.netlify.app`
2. Open browser DevTools (F12 or Cmd+Option+I)
3. Go to the **Console** tab
4. Look for messages starting with `[Supabase]`

You should see either:
- ✅ `[Supabase] Client initialized successfully` - means env vars are working
- ❌ `[Supabase] Missing environment variables` - means env vars aren't being read

### Step 2: Verify Netlify Environment Variables

1. Go to Netlify Dashboard → Your Site → **Site settings** → **Environment variables**
2. Verify these exact variable names (case-sensitive):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Check the **Scopes**:
   - Must include **"Builds"** (this is critical - Vite needs vars at build time!)
   - "All scopes" is safest
4. Check **Values**:
   - Should be set for **Production** deploy context
   - "Same value for all deploy contexts" is fine

### Step 3: Check Netlify Build Logs

1. Go to Netlify Dashboard → Your Site → **Deploys**
2. Click on the latest deploy
3. Check the **Build log**
4. Look for any errors or warnings about environment variables

### Step 4: Trigger a Fresh Build

**Important:** After changing environment variables, you MUST trigger a new build:

1. In Netlify Dashboard, click **"Relaunch to update"** (top right)
2. OR go to **Deploys** → **Trigger deploy** → **Deploy site**
3. Wait for the build to complete
4. Test again

### Step 5: Verify Variable Values

Make sure the values are correct:

- `VITE_SUPABASE_URL` = `https://turofyiazpzzasecnngc.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = Your full anon key (starts with `eyJhbGci...`)

**Common mistakes:**
- ❌ Extra spaces before/after values
- ❌ Missing `VITE_` prefix
- ❌ Wrong variable name (typos)
- ❌ Variables not scoped to "Builds"

### Step 6: Test Locally First

Before deploying, test locally:

1. Make sure `.env` file exists with both variables
2. Run `npm run dev`
3. Open browser console - should see `[Supabase] Client initialized successfully`
4. Test leaderboard button - should work

If it works locally but not on Netlify, the issue is with Netlify env var configuration.

### Quick Fix Checklist

- [ ] Variables are named exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Variables are scoped to **"Builds"** (or "All scopes")
- [ ] Values are set for **Production** context
- [ ] Clicked **"Relaunch to update"** after setting variables
- [ ] Build completed successfully
- [ ] Checked browser console for `[Supabase]` messages
- [ ] Verified Supabase table exists (run the SQL script)

### Still Not Working?

Share:
1. What the browser console shows (the `[Supabase]` messages)
2. Screenshot of your Netlify environment variables page
3. Any errors from Netlify build logs
