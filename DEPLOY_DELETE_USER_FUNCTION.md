# Deploy Delete User Edge Function

This guide will help you deploy the `delete-user` Edge Function to Supabase.

## Prerequisites

- Supabase project with Edge Functions enabled
- Supabase CLI installed (or use the Dashboard)

## Option 1: Deploy via Supabase Dashboard

1. **Navigate to Edge Functions:**
   - Go to your Supabase Dashboard
   - Click on "Edge Functions" in the left sidebar
   - Click "Create a new function"

2. **Create the Function:**
   - Function name: `delete-user`
   - Copy the contents of `supabase/functions/delete-user/index.ts`
   - Paste into the code editor
   - Click "Deploy Function"

3. **Verify Deployment:**
   - The function should appear in your Edge Functions list
   - Status should show as "Active"

## Option 2: Deploy via Supabase CLI

1. **Login to Supabase CLI:**
   ```bash
   npx supabase login
   ```

2. **Link your project (if not already linked):**
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

3. **Deploy the function:**
   ```bash
   npx supabase functions deploy delete-user
   ```

## Function Details

- **Purpose:** Deletes a user from the database, bypassing RLS policies using the service role
- **Authentication:** Requires the current user to be a system admin
- **Safety:** Prevents self-deletion
- **Actions:**
  - Removes user from all sessions (as admin and stakeholder)
  - Removes system admin role if applicable
  - Deletes the user record from the `users` table

## Testing

After deployment, test the function by:
1. Logging in as a system admin
2. Going to the `/users` screen
3. Attempting to delete a user (not yourself)
4. Verifying the user is removed from the list

## Troubleshooting

- **CORS errors:** Ensure the function is deployed and the CORS headers are correct
- **403 Unauthorized:** Verify the current user is a system admin
- **500 errors:** Check the Supabase function logs in the Dashboard

