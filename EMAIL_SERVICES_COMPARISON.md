# Email Service Options (No DNS Verification Required)

## Option 1: Gmail SMTP (Recommended - Easiest Setup)

**Pros:**
- ✅ No DNS verification needed
- ✅ Free (if you have a Gmail account)
- ✅ Easy to set up
- ✅ Works immediately

**Cons:**
- ⚠️ Daily sending limit: 500 emails/day
- ⚠️ Requires Gmail App Password (not your regular password)
- ⚠️ "Sent via Gmail" appears in email headers

**Setup Steps:**

1. **Enable 2-Factor Authentication** on your Gmail account
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter: "Feature Voting System"
   - Copy the 16-character password

3. **Add Secrets to Supabase:**
   - Go to Supabase Dashboard → Edge Functions → Secrets
   - Add these secrets:
     - `SMTP_HOST` = `smtp.gmail.com`
     - `SMTP_PORT` = `587`
     - `SMTP_USER` = `your-email@gmail.com`
     - `SMTP_PASS` = `your-16-char-app-password`
     - `FROM_EMAIL` = `your-email@gmail.com`

4. **Deploy the SMTP function** (I'll create this for you)

---

## Option 2: Outlook/Hotmail SMTP

**Pros:**
- ✅ No DNS verification needed
- ✅ Free (if you have Outlook account)
- ✅ Works immediately

**Cons:**
- ⚠️ Daily sending limit: 300 emails/day
- ⚠️ Requires App Password

**Setup Steps:**

1. **Enable 2-Factor Authentication** on Outlook
2. **Generate App Password**
   - Go to: https://account.microsoft.com/security
   - Security → Advanced security options → App passwords
3. **Add Secrets to Supabase:**
   - `SMTP_HOST` = `smtp-mail.outlook.com`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = `your-email@outlook.com`
   - `SMTP_PASS` = `your-app-password`
   - `FROM_EMAIL` = `your-email@outlook.com`

---

## Option 3: SendGrid (Free Tier)

**Pros:**
- ✅ 100 emails/day free
- ✅ Professional service
- ✅ Good deliverability

**Cons:**
- ⚠️ Still requires domain verification for production
- ⚠️ Can use their test domain temporarily (like Resend)

**Setup:**
- Similar to Resend, but SendGrid's test mode is more lenient

---

## Option 4: Mailgun (Sandbox Mode)

**Pros:**
- ✅ No DNS verification for sandbox
- ✅ 5,000 emails/month free

**Cons:**
- ⚠️ Sandbox only sends to authorized recipients (must add each email)
- ⚠️ "Sent via Mailgun" in headers

---

## Recommendation

**For immediate use without DNS verification: Use Gmail SMTP**

It's the easiest to set up and works right away. The 500 emails/day limit should be plenty for your use case.

Would you like me to:
1. Create a Gmail SMTP version of the Edge Function?
2. Or help you set up one of the other options?

