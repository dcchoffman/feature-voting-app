# How to Change Email Service in EmailJS Template

## Method 1: Edit Template Settings

1. Go to EmailJS Dashboard → **"Email Templates"**
2. Click on your template: `Access Request Notification`
3. Look for a **"Settings"** tab (usually at the top with other tabs like "Content", "Auto-Reply", etc.)
4. In the Settings tab, you should see a **"Service"** dropdown or field
5. Select the new SMTP service: `service_idsx5cg` (or "SMTP server")
6. Save the template

## Method 2: When Editing Template

1. Go to EmailJS Dashboard → **"Email Templates"**
2. Click on your template
3. Look at the right panel where you see "To Email", "From Email", etc.
4. There might be a **"Service"** dropdown at the top of that panel
5. Change it to the new SMTP service
6. Save

## Method 3: Create New Template (If Above Don't Work)

If you can't find where to change the service:

1. Go to **"Email Templates"** → Click **"Create New Template"**
2. When creating, you'll be asked to select a service
3. Select the new SMTP service (`service_idsx5cg`)
4. Copy all the content from your old template:
   - Subject: `{{subject}}`
   - Content: (the HTML structure we set up)
   - To Email: `{{email}}`
   - From Email: `noreply@newmill.com`
   - From Name: `Feature Voting System`
5. Save the new template
6. Get the new Template ID
7. Update the code with the new Template ID

## Quick Check

The service is usually visible:
- In the template editor header/title area
- In a "Settings" tab
- In the right panel with email configuration
- As a dropdown when you first open the template

If you still can't find it, you might need to create a new template with the SMTP service selected from the start.

