# Fixing Mimecast Email Blocking

## Issue
Emails are being blocked by Mimecast (email security service).

## Solutions

### 1. Logo Image Issue (Fixed)
- ✅ Logo is now in `public/` folder and accessible at: `https://dcchoffman.github.io/feature-voting-app/New-Millennium-color-logo.svg`
- The logo will be accessible after you push to GitHub Pages

### 2. Mimecast Blocking - Common Causes

Mimecast blocks emails for several reasons. Here's what to check:

#### A. SPF/DKIM Records (Most Common)
Mimecast checks if the sending domain has proper email authentication:
- **SPF Record**: Verifies the sender is authorized
- **DKIM Record**: Signs emails to prove authenticity
- **DMARC Policy**: Tells receivers what to do with failed emails

**Action Required:**
- Contact your IT/Email administrator
- Ask them to add SPF/DKIM records for `newmill.com` domain
- Or whitelist `FeatureVotingSystem@NewMill.com` in Mimecast

#### B. Email Content Filtering
Mimecast may flag emails that:
- Contain suspicious links
- Have poor HTML formatting
- Look like spam/phishing

**What We've Done:**
- ✅ Clean HTML structure
- ✅ Proper inline styles
- ✅ Clear, professional content
- ✅ Legitimate links only

#### C. Sender Reputation
If Gmail SMTP is new or has low reputation:
- Mimecast may block it initially
- This improves over time as more legitimate emails are sent

### 3. Immediate Workarounds

#### Option 1: Whitelist in Mimecast
Ask your IT team to:
1. Log into Mimecast admin console
2. Go to **Administration → Gateway → Policies → Sender Policy**
3. Add `FeatureVotingSystem@NewMill.com` to whitelist
4. Or whitelist the Gmail SMTP server IPs

#### Option 2: Use Internal Email Service
If you have an internal email server:
- Configure EmailJS to use your company's SMTP server
- This bypasses Mimecast filtering

#### Option 3: Request Access Exception
Ask recipients to:
1. Check their Mimecast quarantine
2. Release the email
3. Add sender to safe senders list

### 4. Long-term Solution

**Best Practice:** Use a dedicated email service with proper domain authentication:
- **SendGrid** (requires domain verification)
- **Mailgun** (requires domain verification)
- **Amazon SES** (requires domain verification)
- **Your company's email server** (if available)

These services have better deliverability and proper SPF/DKIM setup.

### 5. Testing

After pushing the logo fix:
1. Test sending an email
2. Check if logo displays correctly
3. Check Mimecast logs to see why emails are blocked
4. Work with IT to resolve authentication issues

## Current Status

- ✅ Logo path fixed (will work after GitHub Pages deployment)
- ✅ Email HTML cleaned and optimized
- ⚠️ Mimecast blocking requires IT/Email admin intervention

## Next Steps

1. **Push changes to GitHub** (logo fix)
2. **Test email** after deployment
3. **Contact IT/Email admin** about Mimecast whitelisting or SPF/DKIM setup
4. **Consider alternative email service** if Mimecast continues to block

