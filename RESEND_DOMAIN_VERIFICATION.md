# Resend Domain Verification Required

## The Problem

The error in your logs shows:
```
Resend API error: 403 - You can only send testing emails to your own email address (dave.hoffman@newmill.com). 
To send emails to other recipients, please verify a domain at resend.com/domains, and change the 'from' 
address to an email address associated with a verified domain.
```

**Resend's free tier restriction:** You can only send emails to your own email address when using their test domain (`onboarding@resend.dev`).

## The Solution

To send emails to other recipients (like session admins), you need to:

### Option 1: Verify Your Domain (Recommended for Production)

1. **Go to Resend Dashboard:**
   - Visit https://resend.com/domains
   - Click **"Add Domain"**

2. **Add your domain:**
   - Enter: `newmill.com` (or your company domain)
   - Follow the DNS verification steps
   - Add the required DNS records (SPF, DKIM, DMARC)

3. **Update Supabase Secret:**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Update `FROM_EMAIL` to: `noreply@newmill.com` (or your verified domain email)

4. **Redeploy the function** (if needed)

### Option 2: Use Your Email for Testing (Temporary)

For testing purposes only, you can:
1. Update the `FROM_EMAIL` secret to: `dave.hoffman@newmill.com`
2. This will allow sending, but only to your own email address

**Note:** This won't work for sending to session admins - you'll need domain verification for that.

## Quick Fix for Now

If you want to test the function immediately:
1. Go to Supabase Dashboard → Edge Functions → Secrets
2. Update `FROM_EMAIL` to: `dave.hoffman@newmill.com`
3. The function will work, but can only send to `dave.hoffman@newmill.com`

For production use, you **must** verify your domain in Resend.

