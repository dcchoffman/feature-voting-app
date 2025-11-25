# How to Update FROM_EMAIL in Supabase

## Step-by-Step Instructions

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in if needed

2. **Select Your Project**
   - Click on your project (the one with your database)

3. **Navigate to Edge Functions**
   - In the left sidebar, click **"Edge Functions"**
   - Or go directly to: `https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/functions`

4. **Open Secrets**
   - Click on the **"Secrets"** tab at the top
   - This shows all your Edge Function environment variables

5. **Update or Add FROM_EMAIL**
   - Look for `FROM_EMAIL` in the list
   - If it exists:
     - Click on it to edit
     - Change the value to: `noreply@newmill.com` (or any email using your verified domain)
     - Click **"Save"** or **"Update"**
   - If it doesn't exist:
     - Click **"Add Secret"** or **"New Secret"**
     - Name: `FROM_EMAIL`
     - Value: `noreply@newmill.com`
     - Click **"Save"** or **"Add"**

6. **Verify Your Secrets**
   You should have these two secrets:
   - `RESEND_API_KEY` = `re_j3no985P_J9r2jjptFvDwLUB992gayeBV`
   - `FROM_EMAIL` = `noreply@newmill.com` (or your verified domain email)

## Important Notes

- **Wait for DNS verification first:** Only update `FROM_EMAIL` after your domain (`newmill.com`) is verified in Resend
- **Use your verified domain:** The email address must use the domain you verified in Resend (`newmill.com`)
- **No redeploy needed:** Changing secrets doesn't require redeploying the function - it will automatically use the new value

## Alternative Email Addresses

You can use any email address with your verified domain:
- `noreply@newmill.com`
- `notifications@newmill.com`
- `feature-voting@newmill.com`
- `dave.hoffman@newmill.com` (your actual email)

All of these will work once `newmill.com` is verified in Resend.

