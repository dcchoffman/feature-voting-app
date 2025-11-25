# Quick Setup: Add Resend API Key to Supabase

## Step 1: Add Secrets to Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (okdzllfpsvltjqryslnn)
3. Navigate to: **Settings** → **Edge Functions** → **Secrets**
4. Click **Add new secret** and add these two secrets:

   **Secret 1:**
   - Name: `RESEND_API_KEY`
   - Value: `re_j3no985P_J9r2jjptFvDwLUB992gayeBV`

   **Secret 2:**
   - Name: `FROM_EMAIL`
   - Value: `onboarding@resend.dev` (for testing)
   
   **Note:** For production, you'll want to verify your own domain in Resend and use an email like `noreply@yourdomain.com`

## Step 2: Deploy the Edge Function

Open your terminal in the project directory and run:

```bash
# Make sure you're logged in
supabase login

# Link your project (if not already linked)
supabase link --project-ref okdzllfpsvltjqryslnn

# Deploy the function
supabase functions deploy send-invitation-email
```

## Step 3: Test It

After deployment, test the "Request Access" feature on your login page. The emails should now send automatically without CORS errors!

## Security Note

⚠️ **Important**: Your API key is now in this chat. After setting it up:
- The key is stored securely in Supabase (encrypted)
- Never commit API keys to git
- If you need to rotate the key, generate a new one in Resend dashboard and update the Supabase secret

