# Fix Outlook "Cannot send on behalf of" Error

## Error Message
```
412 Outlook: The user account which was used to submit this request does not have the right to send mail on behalf of the specified sending account.
```

## Problem
The Outlook account connected to EmailJS doesn't have permission to send emails using `FeatureVotingSystem@NewMill.com` as the "From" address.

## Solutions

### Solution 1: Use the Authenticated Outlook Account's Email (Easiest)

**In EmailJS Template Settings:**
1. Go to EmailJS Dashboard → **"Email Templates"** → Your template
2. **Remove or clear** the "From Email" field (or set it to use the authenticated account)
3. **Or** set "From Email" to match the Outlook account you connected to EmailJS
4. **"From Name"** can still be: `Feature Voting System`
5. Click **"Save"**

**In Code:**
- Remove the `from_email` parameter that forces `FeatureVotingSystem@NewMill.com`
- Let EmailJS use the authenticated account's email automatically

### Solution 2: Grant Send-As Permission in Outlook/Exchange (For IT Admin)

If you need to use `FeatureVotingSystem@NewMill.com` as the "From" address:

1. **Contact your IT/Email administrator**
2. **Ask them to grant "Send As" permission:**
   - In Exchange Admin Center or Outlook Admin
   - Grant your Outlook account permission to send as `FeatureVotingSystem@NewMill.com`
   - Or create a shared mailbox for `FeatureVotingSystem@NewMill.com` and grant access

3. **Reconnect the service in EmailJS:**
   - Go to EmailJS Dashboard → **"Email Services"** → Your Outlook service
   - Disconnect and reconnect to refresh permissions

### Solution 3: Use Outlook Account's Email with Display Name

**Quick Fix:**
1. Find out what email address is connected to your Outlook service in EmailJS
2. Use that email as the "From" address
3. Set "From Name" to `Feature Voting System`
4. Recipients will see: `Feature Voting System <your-outlook-email@domain.com>`

## Recommended: Update Code to Remove Forced From Address

The code is currently forcing `FeatureVotingSystem@NewMill.com` which doesn't match the authenticated account. We should remove this and let EmailJS use the account's default email.

