# Switch to Gmail SMTP (More Reliable)

## Why Gmail SMTP is Better

- ✅ **HTML emails render properly** (no raw code issues)
- ✅ **Better control over "From" address**
- ✅ **More reliable delivery**
- ✅ **Standard SMTP protocol** (works consistently)

## Setup Steps

### Step 1: Get Gmail App Password

1. Go to: https://myaccount.google.com/
2. Click **"Security"** in the left menu
3. Enable **"2-Step Verification"** (if not already enabled)
4. Go to: https://myaccount.google.com/apppasswords
5. Select:
   - **App:** Mail
   - **Device:** Other (Custom name)
   - Enter: "EmailJS SMTP"
6. Click **"Generate"**
7. **Copy the 16-character password** (you'll need this)

### Step 2: Create SMTP Service in EmailJS

1. Go to EmailJS Dashboard → **"Email Services"**
2. Click **"Add New Service"**
3. Select **"Custom SMTP"** or **"SMTP"**
4. Enter these settings:
   - **SMTP Server:** `smtp.gmail.com`
   - **SMTP Port:** `587`
   - **SMTP Username:** Your Gmail address (e.g., `dave.hoffman.new.millennium@gmail.com`)
   - **SMTP Password:** The 16-character App Password from Step 1
   - **SMTP Security:** TLS/STARTTLS
5. Click **"Create"** or **"Save"**
6. **Copy the new Service ID** (it will be different, like `service_xxxxx`)

### Step 3: Update Your Template

1. Go to **"Email Templates"** → Your template
2. Change the service to the new Gmail SMTP service
3. In **"From Email"** field, enter: `FeatureVotingSystem@NewMill.com`
4. In **"From Name"** field, enter: `Feature Voting System`
5. **Make sure "Use Default Email Address" is UNCHECKED**
6. Save the template

### Step 4: Update Code

Update the Service ID in `src/services/emailService.ts` to use the new SMTP service ID.

## Benefits

- HTML emails will render properly (not as raw code)
- "From" address will show `Feature Voting System <FeatureVotingSystem@NewMill.com>`
- More reliable email delivery
- No API scope issues

## Note About "From" Address

Even with SMTP, some email clients might show "via gmail.com" in small text, but the main "From" will show as `FeatureVotingSystem@NewMill.com`. This is normal and acceptable for most use cases.

