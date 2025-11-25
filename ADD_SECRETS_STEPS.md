# Step-by-Step: Add Secrets to Supabase Edge Function

## Step 1: Navigate to Secrets
1. In the Supabase Dashboard, look at the **left sidebar**
2. Under "MANAGE", click on **"Secrets"** (it's right below "Functions")
3. You should now see a page for managing Edge Function secrets

## Step 2: Add RESEND_API_KEY
1. Click the **"Add new secret"** or **"New secret"** button
2. In the **Name** field, enter: `RESEND_API_KEY`
3. In the **Value** field, enter: `re_j3no985P_J9r2jjptFvDwLUB992gayeBV`
4. Click **"Save"** or **"Add secret"**

## Step 3: Add FROM_EMAIL
1. Click **"Add new secret"** again
2. In the **Name** field, enter: `FROM_EMAIL`
3. In the **Value** field, enter: `onboarding@resend.dev`
4. Click **"Save"** or **"Add secret"**

## Step 4: Verify
You should now see both secrets listed:
- `RESEND_API_KEY`
- `FROM_EMAIL`

## That's it!
Your Edge Function can now access these secrets via `Deno.env.get('RESEND_API_KEY')` and `Deno.env.get('FROM_EMAIL')`.

The function is ready to send emails! Test it by using the "Request Access" feature on your login page.

