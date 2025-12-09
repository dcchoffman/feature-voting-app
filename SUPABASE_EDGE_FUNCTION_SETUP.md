# Supabase Edge Function Setup Guide

This guide will help you set up the `send-invitation-email` Edge Function for sending emails.

## Prerequisites

1. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

2. **Supabase Account** with your project

## Step 1: Install Supabase CLI

If you haven't already:
```bash
npm install -g supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser window for authentication.

## Step 3: Link Your Project

```bash
supabase link --project-ref okdzllfpsvltjqryslnn
```

You'll need to enter your database password when prompted.

## Step 4: Configure Email Service with Resend

1. **Add secrets in Supabase Dashboard**:
   - Go to your Supabase Dashboard: https://supabase.com/dashboard
   - Select your project
   - Navigate to **Settings** → **Edge Functions** → **Secrets**
   - Click **Add new secret** and add:

     **Secret 1:**
     - Name: `RESEND_API_KEY`
     - Value: Your Resend API key (starts with `re_`)

     **Secret 2:**
     - Name: `FROM_EMAIL`
     - Value: `onboarding@resend.dev` (for testing)
     
     **Note:** For production, verify your own domain in Resend and use `noreply@yourdomain.com`

2. **Get your Resend API key** (if you don't have one):
   - Go to https://resend.com/api-keys
   - Sign up for a free account (3,000 emails/month free)
   - Create an API key and copy it

## Step 5: Deploy the Function

```bash
supabase functions deploy send-invitation-email
```

## Step 6: Test the Function

You can test it from the Supabase Dashboard:
1. Go to **Edge Functions** → **send-invitation-email**
2. Click **Invoke function**
3. Use this test payload:
   ```json
   {
     "to": "your-email@example.com",
     "subject": "Test Email",
     "text": "This is a test email",
     "html": "<p>This is a test email</p>"
   }
   ```

## Troubleshooting

### CORS Errors

If you see CORS errors, the function should already handle this. If issues persist:
1. Check that the function is deployed
2. Verify your Supabase project URL matches your frontend origin
3. Check browser console for specific error messages

### Email Not Sending

1. **Check Secrets**: Verify all required secrets are set in Supabase Dashboard
2. **Check Logs**: Go to **Edge Functions** → **send-invitation-email** → **Logs** to see error messages
3. **Test Resend/SMTP**: Verify your email service credentials are correct
4. **Check Spam**: Emails might be going to spam folder

### Function Not Found

If you get a 404 error:
1. Verify the function is deployed: `supabase functions list`
2. Check the function name matches exactly: `send-invitation-email`
3. Ensure you're using the correct project

## Local Development

To test locally before deploying:

```bash
supabase functions serve send-invitation-email
```

Then test with:
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-invitation-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "to": "test@example.com",
    "subject": "Test",
    "html": "<p>Test</p>"
  }'
```

Replace `YOUR_ANON_KEY` with your Supabase anon key from `src/supabaseClient.ts`.

## Next Steps

Once the function is deployed and working:
2. Test the "Request Access" feature on the login page
3. Verify emails are being sent to product owners
4. Check that the fallback mailto mechanism still works as a backup

