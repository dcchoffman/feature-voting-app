# Supabase Edge Functions

This directory contains Supabase Edge Functions for the Feature Voting System.

## Setup

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref okdzllfpsvltjqryslnn
   ```

## Functions

### send-invitation-email

Sends invitation emails using Resend (recommended) or SMTP.

#### Configuration

Set environment variables in your Supabase project:

**Option 1: Using Resend (Recommended)**
1. Sign up at https://resend.com
2. Get your API key
3. Set in Supabase Dashboard: Settings → Edge Functions → Secrets
   - `RESEND_API_KEY`: Your Resend API key
   - `SMTP_FROM`: Your verified sender email (e.g., `noreply@yourdomain.com`)

**Option 2: Using SMTP**
Set these secrets in Supabase Dashboard:
- `SMTP_HOST`: Your SMTP server (e.g., `smtp.gmail.com`)
- `SMTP_PORT`: SMTP port (usually `587` for TLS)
- `SMTP_USER`: Your SMTP username
- `SMTP_PASSWORD`: Your SMTP password
- `SMTP_FROM`: Sender email address

#### Deploy

```bash
supabase functions deploy send-invitation-email
```

#### Test Locally

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
    "subject": "Test Email",
    "text": "This is a test email",
    "html": "<p>This is a test email</p>"
  }'
```

## Environment Variables

Set these in Supabase Dashboard → Settings → Edge Functions → Secrets:

- `RESEND_API_KEY` (recommended) - Your Resend API key
- `SMTP_FROM` - Sender email address
- `SMTP_HOST` (optional) - SMTP server hostname
- `SMTP_PORT` (optional) - SMTP port (default: 587)
- `SMTP_USER` (optional) - SMTP username
- `SMTP_PASSWORD` (optional) - SMTP password

## CORS Configuration

The function includes CORS headers to allow requests from your frontend. If you need to restrict origins, modify `_shared/cors.ts`.

