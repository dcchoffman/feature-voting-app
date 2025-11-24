# Azure DevOps OAuth Setup

## Issue
When connecting to Azure DevOps, you may see an error:
```
AADSTS50011: The redirect URI 'http://localhost:5173/feature-voting-app/admin' specified in the request does not match the redirect URIs configured for the application.
```

This means the redirect URI needs to be registered in your Azure AD app registration.

## Solution

### Step 1: Register Redirect URIs in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app: `a6283b6c-2210-4d6c-bade-651acfdb6703`
4. Click on **Authentication** in the left menu
5. Under **Redirect URIs**, click **Add a platform** → **Web**
6. Add the following redirect URIs:

   **For Local Development:**
   - `http://localhost:5173/feature-voting-app/admin`
   - `http://localhost:5173/feature-voting-app/**` (wildcard pattern if supported)

   **For Production (GitHub Pages):**
   - `https://dcchoffman.github.io/feature-voting-app/admin`
   - `https://dcchoffman.github.io/feature-voting-app/**` (wildcard pattern if supported)

7. Click **Save**

### Step 2: Verify Platform Type

Make sure the redirect URIs are added under the **Web** platform type, not **Single-page application (SPA)**. Azure DevOps OAuth requires the Web platform type.

### Step 3: Test the Connection

After registering the redirect URIs:
1. Clear your browser cache
2. Try connecting to Azure DevOps again from the admin dashboard
3. The OAuth flow should now redirect correctly

## Notes

- The redirect URI must match **exactly** (including the path `/admin`)
- Both localhost and production URLs need to be registered separately
- Changes to redirect URIs in Azure AD may take a few minutes to propagate
- If using a different port for local development, update the redirect URI accordingly

## Troubleshooting

If you still see the error after registering:
1. Wait 2-3 minutes for Azure AD changes to propagate
2. Clear browser cache and cookies
3. Try in an incognito/private window
4. Verify the redirect URI in the error message matches exactly what you registered
5. Check that the platform type is set to **Web**, not **SPA**

