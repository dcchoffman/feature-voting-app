# Switching to Outlook Email Service in EmailJS

## What's Already Updated ✅

1. **Client-side code** (`src/services/emailService.ts`)
   - ✅ Service ID updated to `service_idsx5cg`
   - ✅ This is what your app actually uses (client-side EmailJS)

## What You Need to Update

### 1. EmailJS Dashboard - Template Settings

1. **Go to EmailJS Dashboard** → **"Email Templates"** → Your template (`template_4owif48`)
2. **In the template settings (right panel):**
   - **"Use Service"** dropdown → Select `service_idsx5cg` (your Outlook service)
   - **"From Email"**: `FeatureVotingSystem@NewMill.com`
   - **"From Name"**: `Feature Voting System`
3. **Click "Save"**

### 2. Supabase Edge Function (Optional - Only if you use it)

**Note:** Your app currently uses **client-side EmailJS** (not the Supabase Edge Function), so you may not need to update Supabase. However, if you want to keep it in sync:

1. **Go to Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**
2. **Update the secret:**
   - **Name:** `EMAILJS_SERVICE_ID`
   - **Value:** `service_idsx5cg`
3. **Click "Save"**

**Important:** The Supabase Edge Function is only used if you call it directly. Your current code uses client-side EmailJS, so Supabase secrets are optional.

### 3. Verify Outlook Service is Active

1. **Go to EmailJS Dashboard** → **"Email Services"**
2. **Find `service_idsx5cg`** (Outlook service)
3. **Make sure it's:**
   - ✅ Active/Enabled
   - ✅ Connected to your Outlook account
   - ✅ Has proper permissions

### 4. Test the Email

1. **In EmailJS Dashboard** → **"Email Templates"** → Your template
2. **Click "Test Email"**
3. **Fill in test parameters:**
   - `email`: Your email address
   - `subject`: Test
   - `message_html`: `<p>Test email</p>`
4. **Click "Send Test Email"**
5. **Check your inbox** to verify it's working

## Summary

- ✅ **Code updated** - Service ID is `service_idsx5cg`
- ⚠️ **EmailJS Template** - Need to select `service_idsx5cg` in template settings
- ⚠️ **Supabase Secrets** - Optional (only if you use the Edge Function)
- ⚠️ **Outlook Service** - Verify it's active and connected

## Troubleshooting

If emails aren't sending:
1. Check EmailJS Dashboard → **"Logs"** for error messages
2. Verify Outlook service is active in EmailJS
3. Check Outlook account permissions in EmailJS
4. Make sure template is using the correct service ID

