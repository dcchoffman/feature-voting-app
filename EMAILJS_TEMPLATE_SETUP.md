# EmailJS Template Configuration Fix

## The Problem

The error "The recipients address is empty" means EmailJS doesn't know where to send the email. The recipient email must be configured in the EmailJS template settings.

## Solution: Configure the Template "To Email" Field

1. **Go to EmailJS Dashboard:**
   - Navigate to: https://dashboard.emailjs.com/
   - Go to **"Email Templates"**
   - Click on your template: `Access Request Notification` (template_cj0ubjg)

2. **Configure the "To Email" Field:**
   - In the template editor, look for the **"To Email"** field (usually at the top of the template settings)
   - **Change it from a static email to:** `{{to_email}}`
   - This tells EmailJS to use the `to_email` parameter we're sending

3. **Save the Template:**
   - Click **"Save"** to save your changes

## Alternative: If "To Email" Field is Not Visible

If you don't see a "To Email" field in the template editor:

1. **Check Template Settings:**
   - Look for a "Settings" or "Configuration" tab
   - Find the "Recipient" or "To Email" setting
   - Set it to: `{{to_email}}`

2. **Or Use the Template Variables:**
   - Some EmailJS templates require the recipient to be set in the service configuration
   - Go to **"Email Services"** → Your Outlook service
   - Check if there's a "Default Recipient" setting that needs to be cleared or set to use template variables

## Verify Your Template Variables

Make sure your template has these variables configured:

- **Subject:** `{{subject}}`
- **Content/Body:** `{{message_html}}` (or `{{message_text}}`)
- **To Email:** `{{to_email}}` ← **This is the key one that's missing!**

## After Making Changes

1. Save the template
2. Try sending an email again from your app
3. The error should be resolved

If you still get errors, check:
- EmailJS Dashboard → **"Email History"** to see detailed error messages
- Make sure your Outlook service is properly connected
- Verify all template variables match what we're sending

