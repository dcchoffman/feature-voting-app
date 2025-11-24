# Supabase OAuth Configuration for GitHub Pages

## Issue
When deploying to GitHub Pages, Microsoft OAuth redirects may fail because Supabase uses the `site_url` from project settings (which may be set to `localhost:3000` for local development).

## Solution

You can configure Supabase to work with **both** localhost (for development) and GitHub Pages (for production) by setting up multiple redirect URLs.

### Step 1: Configure Site URL (Primary)
The Site URL should be set to your **production** URL:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Set the **Site URL** to: `https://dcchoffman.github.io/feature-voting-app`

### Step 2: Add Redirect URLs (Multiple Environments)
Add **both** localhost and GitHub Pages URLs to the **Redirect URLs** list:

1. In the same **URL Configuration** section
2. Under **Redirect URLs**, click **"Add new Redirect URL"**
3. Add each of these URLs (one at a time):
   - `http://localhost:5173/**` (for Vite dev server)
   - `http://localhost:3000/**` (if you use a different port)
   - `https://dcchoffman.github.io/feature-voting-app/**` (for GitHub Pages)

**Note:** The wildcard `/**` allows all paths under that base URL to work.

### Step 3: Azure AD App Registration
Make sure your Azure AD app registration has the correct redirect URIs:

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Select your app
3. Go to **Authentication**
4. Under **Redirect URIs**, ensure you have:
   - `https://okdzllfpsvltjqryslnn.supabase.co/auth/v1/callback` (Supabase callback - this is the only one needed in Azure AD)

## How It Works

- **Site URL**: This is the primary URL Supabase uses for OAuth state tokens. It should be your production URL.
- **Redirect URLs**: These are the allowed URLs that Supabase will redirect to after authentication. You can add multiple URLs here to support both development and production.

The code automatically detects which environment you're in:
- When running on `localhost`, it uses `http://localhost:5173/sessions` (or your dev port)
- When running on GitHub Pages, it uses `https://dcchoffman.github.io/feature-voting-app/sessions`

## Testing

### Local Development:
1. Make sure `http://localhost:5173/**` is in your Supabase Redirect URLs
2. Run `npm run dev`
3. Try signing in with Microsoft - it should work on localhost

### Production (GitHub Pages):
1. Make sure `https://dcchoffman.github.io/feature-voting-app/**` is in your Supabase Redirect URLs
2. Deploy to GitHub Pages
3. Try signing in with Microsoft - it should work on GitHub Pages

## Note

The `redirectTo` option in the code automatically detects the current environment and uses the appropriate URL. The OAuth callback URL is always handled by Supabase and uses the Site URL from project settings, but the final redirect respects the `redirectTo` parameter and will work as long as that URL is in your Redirect URLs list.

