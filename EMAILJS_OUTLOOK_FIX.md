# Fix EmailJS Outlook Permission Error

## The Problem

Error: "Outlook: The user account which was used to submit this request does not have the right to send mail on behalf of the specified sending account."

This means your Outlook account in EmailJS doesn't have the correct permissions to send emails.

## Solution Options

### Option 1: Reconnect Outlook Service (Recommended)

1. **Go to EmailJS Dashboard:**
   - Navigate to: https://dashboard.emailjs.com/
   - Go to **"Email Services"**

2. **Edit Your Outlook Service:**
   - Click on your Outlook service (`service_jekfgl3`)
   - Click **"Edit"** or the settings icon

3. **Reconnect Outlook:**
   - Click **"Reconnect"** or **"Disconnect and Reconnect"**
   - Sign in with your Outlook account again
   - Make sure to grant all requested permissions
   - **Important:** Grant permission to "Send mail on your behalf"

4. **Save and Test:**
   - Save the service
   - Use the "Test Email" feature to verify it works

### Option 2: Switch to Gmail (Easier Setup)

Gmail is often easier to configure with EmailJS:

1. **Create New Gmail Service:**
   - Go to EmailJS Dashboard → **"Email Services"**
   - Click **"Add New Service"**
   - Select **"Gmail"**

2. **Connect Gmail:**
   - Sign in with your Gmail account
   - Grant permissions (Gmail usually works better with EmailJS)

3. **Update Your Template:**
   - Go to **"Email Templates"** → Your template
   - Change the service to the new Gmail service
   - Save

4. **Update Code (if needed):**
   - Update `EMAILJS_SERVICE_ID` in `src/services/emailService.ts` to the new Gmail service ID

### Option 3: Check Outlook Account Permissions

If you're using a work/school Outlook account:

1. **Check with IT Admin:**
   - Some organizations restrict sending emails via third-party services
   - You may need admin approval

2. **Use Personal Outlook Account:**
   - Try using a personal Outlook/Hotmail account instead
   - Personal accounts usually have fewer restrictions

## Quick Test

After reconnecting or switching services:

1. Go to EmailJS Dashboard → **"Email Templates"**
2. Click on your template
3. Click **"Test Email"** button
4. Enter a test email address
5. Click **"Send Test"**
6. Check if the email is received

If the test email works, your app should work too!

## Which Option Should You Choose?

- **Option 1** if you want to keep using Outlook
- **Option 2** if you want the easiest setup (Gmail is usually more reliable with EmailJS)
- **Option 3** if you're using a work account and need IT help

