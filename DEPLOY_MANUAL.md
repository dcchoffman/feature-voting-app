# Manual Deployment Instructions

The Supabase CLI is having issues with the Windows path. Here's how to deploy manually:

## Option 1: Deploy via Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard/project/okdzllfpsvltjqryslnn/functions
2. Click **"Create a new function"** or **"Deploy a function"**
3. Name it: `send-invitation-email`
4. Copy the contents of `supabase/functions/send-invitation-email/index.ts` into the editor
5. Copy the contents of `supabase/functions/_shared/cors.ts` into a shared file (if the dashboard supports it)
6. Click **Deploy**

## Option 2: Use WSL or Git Bash

If you have WSL (Windows Subsystem for Linux) or Git Bash:

```bash
cd "/c/Users/dave.hoffman/OneDrive - Steel Dynamics Inc/Documents/feature-voting-system"
export SUPABASE_ACCESS_TOKEN="sbp_18ae989b0a0c30915d2ebcb4c9f05a6068df986c"
npx supabase functions deploy send-invitation-email
```

## Option 3: Fix Path Issue

The CLI is detecting `C:\` as the workdir. Try:

1. Create a `.supabase` folder in your project root (if it doesn't exist)
2. Or run from a directory without spaces in the path
3. Or use the short path name (8.3 format)

## After Deployment

Once deployed, make sure to:
1. Add secrets in Supabase Dashboard:
   - `RESEND_API_KEY` = `re_j3no985P_J9r2jjptFvDwLUB992gayeBV`
   - `FROM_EMAIL` = `onboarding@resend.dev`

2. Test the function from the dashboard or your app

