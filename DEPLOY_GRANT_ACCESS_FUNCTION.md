# Deploy Grant Access Edge Function

This guide explains how to deploy the `grant-access` Edge Function to Supabase.

## Prerequisites

1. Supabase CLI installed (or use the Supabase Dashboard)
2. Access to your Supabase project

## Option 1: Deploy via Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Create a new function**
4. Name it: `grant-access`
5. Copy the contents of `supabase/functions/grant-access/index.ts` into the editor
6. Click **Deploy**

## Option 2: Deploy via Supabase CLI

1. Open a terminal in your project root
2. Run:
   ```bash
   supabase functions deploy grant-access
   ```

## Set Required Secrets

After deploying, you need to set the `GRANT_ACCESS_SECRET` secret:

1. Go to **Settings** → **Edge Functions** → **Secrets**
2. Add a new secret:
   - **Name**: `GRANT_ACCESS_SECRET`
   - **Value**: `default-secret-change-in-production` (or use a secure random string)
3. **Important**: Use the same secret value in both:
   - The Edge Function secret (`GRANT_ACCESS_SECRET`)
   - The client-side code (`src/utils/grantAccessToken.ts` - line 11)

## Verify Deployment

After deployment, the function should be available at:
```
https://[your-project-ref].supabase.co/functions/v1/grant-access
```

## Security Note

For production, change the `GRANT_ACCESS_SECRET` to a strong, random string and ensure it matches in both:
- Supabase Edge Function secrets
- `src/utils/grantAccessToken.ts`

