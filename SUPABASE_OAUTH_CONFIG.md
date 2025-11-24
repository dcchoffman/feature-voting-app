# Supabase OAuth Configuration for GitHub Pages

## Issue
When deploying to GitHub Pages, Microsoft OAuth redirects may fail because Supabase uses the `site_url` from project settings (which may be set to `localhost:3000` for local development).

## Solution

You need to update the **Site URL** in your Supabase project settings:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Update the **Site URL** to: `https://dcchoffman.github.io/feature-voting-app`
5. Add to **Redirect URLs**: `https://dcchoffman.github.io/feature-voting-app/**`

## Additional Configuration

### Azure AD App Registration
Make sure your Azure AD app registration has the correct redirect URIs:

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Select your app
3. Go to **Authentication**
4. Under **Redirect URIs**, ensure you have:
   - `https://okdzllfpsvltjqryslnn.supabase.co/auth/v1/callback` (Supabase callback)
   - `https://dcchoffman.github.io/feature-voting-app/sessions` (Post-auth redirect)

## Testing

After updating the Site URL in Supabase:
1. Clear your browser cache
2. Try signing in with Microsoft again
3. The OAuth flow should now redirect correctly to GitHub Pages

## Note

The `redirectTo` option in the code only controls where users are redirected AFTER authentication completes. The OAuth callback URL is always handled by Supabase and uses the Site URL from project settings.

