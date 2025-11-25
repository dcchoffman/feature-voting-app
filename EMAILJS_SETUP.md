# EmailJS Setup Guide

## Step 1: Sign Up for EmailJS

1. Go to: https://www.emailjs.com/
2. Click **"Sign Up"** (free account)
3. Create your account

## Step 2: Add Email Service

1. In EmailJS Dashboard, go to **"Email Services"**
2. Click **"Add New Service"**
3. Choose your email provider:
   - **Gmail** (recommended - easiest)
   - **Outlook** 
   - **Custom SMTP** (if you have your own)
4. Follow the setup instructions:
   - For Gmail: You'll need to allow EmailJS to access your Gmail
   - For Outlook: Similar OAuth process
5. **Copy the Service ID** (you'll need this)

## Step 3: Create Email Template

1. Go to **"Email Templates"** in EmailJS Dashboard
2. Click **"Create New Template"** (or select a template and click "Create Template")
3. In the template editor, you'll see:
   - **Template Name** field at the top - enter: `Access Request Notification`
   - **Subject** field - enter: `{{subject}}`
   - **Content** area (HTML editor) - enter:

```html
{{message_html}}
```

**Important:** The template variables `{{subject}}`, `{{message_html}}`, and `{{message_text}}` will be replaced with actual content when the email is sent.

**Alternative (if you want to add formatting):**
```html
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  {{message_html}}
</div>
```

4. Click **"Save"** or **"Create"** to save the template
5. **Copy the Template ID** - it will be shown after creation (usually starts with `template_`)

## Step 4: Get Your Public Key

1. Go to **"Account"** → **"General"** in EmailJS Dashboard
2. Find your **"Public Key"** (also called User ID)
3. **Copy the Public Key**

## Step 5: Add Secrets to Supabase

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Settings** → **Edge Functions** → **Secrets**
4. Add these three secrets:

   **Secret 1:**
   - Name: `EMAILJS_SERVICE_ID`
   - Value: `[Your Service ID from Step 2]`

   **Secret 2:**
   - Name: `EMAILJS_TEMPLATE_ID`
   - Value: `[Your Template ID from Step 3]`

   **Secret 3:**
   - Name: `EMAILJS_PUBLIC_KEY`
   - Value: `[Your Public Key from Step 4]`

## Step 6: Deploy Updated Edge Function

1. Copy the updated code from `supabase/functions/send-invitation-email/index.ts`
2. Go to Supabase Dashboard → **Edge Functions** → `send-invitation-email`
3. Click **"Edit Function"**
4. Paste the updated code
5. Click **"Deploy Function"**

## Step 7: Test It

1. Go to your login page
2. Click "Request Access"
3. Fill out the form and submit
4. Check if the email is sent successfully

## Troubleshooting

**Error: "EmailJS not configured"**
- Make sure all three secrets are added in Supabase
- Check that the secret names match exactly (case-sensitive)

**Error: "Invalid service_id"**
- Verify your Service ID is correct
- Make sure the service is active in EmailJS dashboard

**Error: "Invalid template_id"**
- Verify your Template ID is correct
- Make sure the template exists and is active

**Emails not sending:**
- Check EmailJS dashboard → **Logs** to see error details
- Verify your email service (Gmail/Outlook) is properly connected
- Check that you haven't exceeded the free tier limit (200 emails/month)

## Free Tier Limits

- **200 emails/month** on the free plan
- Upgrade to paid plan ($15/month) for 1,000 emails/month if needed

## Notes

- No DNS verification required! ✅
- Works immediately after setup
- Can send to any email address
- Professional service with good deliverability

