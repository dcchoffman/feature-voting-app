# Get Supabase Access Token

To deploy the Edge Function, you need a Supabase access token. Here's how to get it:

## Option 1: Get Access Token from Dashboard

1. Go to https://supabase.com/dashboard/account/tokens
2. Click **Generate new token**
3. Give it a name (e.g., "Edge Function Deployment")
4. Copy the token (you'll only see it once!)

## Option 2: Use Browser Login

If you prefer, you can run this command in your own terminal (it will open a browser):
```bash
npx supabase login
```

Once you have the token, I can use it to deploy the function.

