# Azure DevOps OAuth Setup

## Issues

### Issue 1: Redirect URI Mismatch
When connecting to Azure DevOps, you may see an error:
```
AADSTS50011: The redirect URI 'http://localhost:5173/feature-voting-app/admin' specified in the request does not match the redirect URIs configured for the application.
```

### Issue 2: Cross-Origin Token Redemption
You may also see:
```
AADSTS9002326: Cross-origin token redemption is permitted only for the 'Single-Page Application' client-type.
```

This means the app registration needs to be configured as a **Single-Page Application (SPA)**, not **Web**, because the token exchange happens client-side.

## Solution

### Step 1: Configure App as Single-Page Application (SPA)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app: `a6283b6c-2210-4d6c-bade-651acfdb6703`
4. Click on **Authentication** in the left menu
5. Under **Platform configurations**, check if you have a **Single-page application** platform configured
   - If not, click **Add a platform** → **Single-page application**
   - If you have a **Web** platform configured, you can keep it, but you **must** also have **Single-page application**

### Step 2: Register Redirect URIs

1. Under the **Single-page application** platform section, add the following redirect URIs:

   **For Local Development:**
   - `http://localhost:5173/feature-voting-app/admin`
   - `http://localhost:5173/feature-voting-app/**` (if wildcard is supported)

   **For Production (GitHub Pages):**
   - `https://dcchoffman.github.io/feature-voting-app/admin`
   - `https://dcchoffman.github.io/feature-voting-app/**` (if wildcard is supported)

2. Click **Save**

### Step 3: Verify Platform Type

**IMPORTANT:** The redirect URIs must be added under the **Single-page application (SPA)** platform type, not **Web**. This is required because the application exchanges the authorization code for tokens directly from the browser (client-side), which requires SPA configuration.

### Step 4: Test the Connection

After configuring the app as SPA and registering the redirect URIs:
1. Wait 2-3 minutes for Azure AD changes to propagate
2. Clear your browser cache and cookies
3. Try connecting to Azure DevOps again from the admin dashboard
4. The OAuth flow should now redirect correctly and exchange tokens successfully

## Notes

- The redirect URI must match **exactly** (including the path `/admin`)
- Both localhost and production URLs need to be registered separately
- Changes to redirect URIs in Azure AD may take a few minutes to propagate
- If using a different port for local development, update the redirect URI accordingly

## Troubleshooting

### If you see "Redirect URI mismatch" error:
1. Verify the redirect URI in the error message matches exactly what you registered
2. Make sure the redirect URI is added under **Single-page application (SPA)** platform
3. Check that both localhost and production URLs are registered if needed

### If you see "Cross-origin token redemption" error:
1. **This is the critical fix:** Make sure your app has a **Single-page application (SPA)** platform configured
2. The redirect URIs must be under the **SPA** platform, not **Web**
3. If you only have **Web** platform, add **Single-page application** platform and move/add the redirect URIs there

### General troubleshooting:
1. Wait 2-3 minutes for Azure AD changes to propagate
2. Clear browser cache and cookies
3. Try in an incognito/private window
4. Verify PKCE is enabled (it should be automatic for SPA platform)

