# Fix EmailJS Gmail API Scope Error

## The Problem

Error: "Gmail_API: Request had insufficient authentication scopes."

This means Gmail didn't grant EmailJS the correct permissions to send emails.

## Solution: Reconnect Gmail with Correct Scopes

### Step 1: Disconnect Existing Gmail Service (if any)

1. Go to EmailJS Dashboard → **"Email Services"**
2. If you have a Gmail service that failed, delete it or disconnect it

### Step 2: Create New Gmail Service

1. Click **"Add New Service"**
2. Select **"Gmail"**
3. Click **"Connect Account"**

### Step 3: Grant All Permissions

**IMPORTANT:** When Google asks for permissions:

1. **Click "Allow"** for all permission requests
2. Make sure you see permissions like:
   - "Send email on your behalf"
   - "View and manage your email"
   - "See, edit, create, and delete your email"

3. **Don't skip any permissions** - Gmail needs full email access to send emails

### Step 4: Complete the OAuth Flow

1. Complete the Google sign-in process
2. Make sure you see a success message
3. The service should now be connected

### Step 5: Test the Service

1. Go to **"Email Templates"**
2. Click on your template
3. Click **"Test Email"**
4. Enter your email address
5. Click **"Send Test"**
6. Check your inbox

## Alternative: Use Gmail SMTP Instead

If the Gmail API continues to have scope issues, you can use Gmail SMTP:

1. **Go to EmailJS Dashboard → "Email Services"**
2. Click **"Add New Service"**
3. Select **"Custom SMTP"** (or "SMTP")
4. Enter these settings:
   - **SMTP Server:** `smtp.gmail.com`
   - **SMTP Port:** `587`
   - **SMTP Username:** Your Gmail address
   - **SMTP Password:** Your Gmail App Password (see below)

### Get Gmail App Password

1. Go to: https://myaccount.google.com/
2. Click **"Security"** in the left menu
3. Enable **"2-Step Verification"** (if not already enabled)
4. Go to: https://myaccount.google.com/apppasswords
5. Select **"Mail"** and **"Other (Custom name)"**
6. Enter: "EmailJS"
7. Click **"Generate"**
8. Copy the 16-character password
9. Use this password in the SMTP settings (not your regular Gmail password)

## Why This Happens

Gmail API requires specific OAuth scopes to send emails. Sometimes:
- The OAuth flow doesn't request all needed scopes
- You might have denied some permissions
- Your Google account might have restrictions

## Troubleshooting

**If you still get scope errors:**

1. **Check Google Account Settings:**
   - Go to: https://myaccount.google.com/permissions
   - Find "EmailJS" in the list
   - Click **"Remove access"**
   - Try connecting again

2. **Use a Personal Gmail Account:**
   - Work/school Gmail accounts often have restrictions
   - Try with a personal Gmail account

3. **Try SMTP Instead:**
   - SMTP is more reliable and doesn't require OAuth scopes
   - Use the SMTP method described above

## Recommendation

**Use Gmail SMTP** - It's more reliable and doesn't have OAuth scope issues. The setup is straightforward once you have the App Password.

