# Fix App Issues - Instructions

## Problem
If your app stopped working after applying security fixes, it's likely because Row Level Security (RLS) policies are blocking database access.

## Quick Fix Options

### Option 1: Temporarily Disable RLS (Fastest)
If you need the app working immediately:

1. Go to your Supabase Dashboard
2. Open the SQL Editor
3. Run the file: `disable_rls_temporarily.sql`
4. This will disable RLS on all tables so your app works again
5. **WARNING**: This reduces security - only use temporarily!

### Option 2: Use Permissive RLS Policies (Recommended)
This enables RLS but with permissive policies that allow authenticated users to access data:

1. Go to your Supabase Dashboard
2. Open the SQL Editor
3. Run the file: `fix_security_issues_permissive.sql`
4. This will:
   - Enable RLS on all tables
   - Fix function search path issues
   - Create permissive policies that allow authenticated users to access data
   - Keep your app functional while maintaining basic security

### Option 3: Use Restrictive RLS Policies (Most Secure)
If you want tighter security:

1. Go to your Supabase Dashboard
2. Open the SQL Editor
3. Run the file: `fix_security_issues.sql`
4. **Note**: You may need to customize the policies based on your access patterns
5. Test thoroughly to ensure all features work

## Additional Steps

### Enable Leaked Password Protection (Optional)
This is a **Pro plan feature** and is **NOT required** for your app to function.

**If you have a Pro plan or above:**
1. Go to **Authentication > Emails** in Supabase Dashboard
2. Scroll down to find **"Prevent use of leaked passwords"** section
3. Toggle the switch to **ON** (green)
4. Click **"Save"** at the bottom of the page

**If you're on the Free plan (like most users):**
- **You can skip this step entirely** - it's not required
- The Security Advisor warning about this is informational only
- Your app will work perfectly fine without this feature
- This feature only affects email/password authentication, not OAuth (Azure AD)

**Note:** Since you're using Azure AD OAuth for authentication, this feature wouldn't apply to your users anyway. It only checks passwords when users sign up or change passwords via email authentication.

## How to Check if RLS is the Problem

1. Open your browser's Developer Console (F12)
2. Look for errors like:
   - `new row violates row-level security policy`
   - `permission denied for table`
   - `PGRST301` or similar Supabase errors
3. If you see these errors, RLS is blocking access

## Testing After Fix

After applying a fix, test these features:
- [ ] User login
- [ ] Viewing sessions
- [ ] Creating sessions
- [ ] Voting on features
- [ ] Admin functions
- [ ] User management

## Next Steps

Once your app is working:
1. Review the RLS policies
2. Customize them based on your security requirements
3. Test thoroughly
4. Consider adding tenant-based isolation if needed

