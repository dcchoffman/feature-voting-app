-- ============================================
-- Security Fixes Migration
-- ============================================
-- This migration addresses Supabase Security Advisor warnings:
-- 1. Enable Row Level Security (RLS) on all public schema tables
-- 2. Set search_path on functions to prevent search path injection
-- 3. Note: Leaked password protection must be enabled in Supabase Dashboard
-- ============================================

-- ============================================
-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON TABLES
-- ============================================

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Enable RLS on info_requests table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'info_requests') THEN
        ALTER TABLE public.info_requests ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Enable RLS on system_admins table
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;

-- Enable RLS on session_admins table
ALTER TABLE public.session_admins ENABLE ROW LEVEL SECURITY;

-- Enable RLS on session_stakeholders table
ALTER TABLE public.session_stakeholders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on voting_sessions table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voting_sessions') THEN
        ALTER TABLE public.voting_sessions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Enable RLS on features table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'features') THEN
        ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Enable RLS on votes table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'votes') THEN
        ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Enable RLS on session_status_notes table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_status_notes') THEN
        ALTER TABLE public.session_status_notes ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Enable RLS on azure_devops_config table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'azure_devops_config') THEN
        ALTER TABLE public.azure_devops_config ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================
-- 2. FIX FUNCTION SEARCH PATH
-- ============================================

-- Fix set_created_by_name function
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'set_created_by_name'
    ) THEN
        ALTER FUNCTION public.set_created_by_name() SET search_path = '';
    END IF;
END $$;

-- Fix update_updated_at_column function
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column'
    ) THEN
        ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
    END IF;
END $$;

-- ============================================
-- 3. CREATE BASIC RLS POLICIES
-- ============================================
-- Note: These are basic policies. You should customize them based on your access requirements.
-- The policies below allow authenticated users to read their own data and system admins to access everything.

-- Users table policies
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
    DROP POLICY IF EXISTS "System admins can view all users" ON public.users;
    DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
    DROP POLICY IF EXISTS "System admins can update all users" ON public.users;
    
    -- Create SELECT policy: Users can view their own data
    CREATE POLICY "Users can view their own data" ON public.users
        FOR SELECT
        USING (auth.uid()::text = id OR EXISTS (
            SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()::text
        ));
    
    -- Create SELECT policy: System admins can view all users
    CREATE POLICY "System admins can view all users" ON public.users
        FOR SELECT
        USING (EXISTS (
            SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()::text
        ));
    
    -- Create UPDATE policy: Users can update their own data
    CREATE POLICY "Users can update their own data" ON public.users
        FOR UPDATE
        USING (auth.uid()::text = id);
    
    -- Create UPDATE policy: System admins can update all users
    CREATE POLICY "System admins can update all users" ON public.users
        FOR UPDATE
        USING (EXISTS (
            SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()::text
        ));
    
    -- Create INSERT policy: Allow authenticated users to create their own user record
    CREATE POLICY "Users can insert their own data" ON public.users
        FOR INSERT
        WITH CHECK (auth.uid()::text = id OR EXISTS (
            SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()::text
        ));
END $$;

-- Products table policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view products in their tenant" ON public.products;
    DROP POLICY IF EXISTS "System admins can manage all products" ON public.products;
    
    -- Allow users to view products in their tenant
    CREATE POLICY "Users can view products in their tenant" ON public.products
        FOR SELECT
        USING (
            tenant_id IN (
                SELECT tenant_id FROM public.users WHERE id = auth.uid()::text
            )
            OR EXISTS (
                SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()::text
            )
        );
    
    -- Allow system admins to manage all products
    CREATE POLICY "System admins can manage all products" ON public.products
        FOR ALL
        USING (EXISTS (
            SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()::text
        ));
END $$;

-- System admins table policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "System admins can view system admins" ON public.system_admins;
    
    -- Only system admins can view system admins
    CREATE POLICY "System admins can view system admins" ON public.system_admins
        FOR SELECT
        USING (EXISTS (
            SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()::text
        ));
END $$;

-- Session admins table policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their session admin roles" ON public.session_admins;
    DROP POLICY IF EXISTS "Session admins can view their sessions" ON public.session_admins;
    
    -- Users can view their own session admin roles
    CREATE POLICY "Users can view their session admin roles" ON public.session_admins
        FOR SELECT
        USING (
            user_id = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()::text
            )
        );
    
    -- Session admins can view their assigned sessions
    CREATE POLICY "Session admins can view their sessions" ON public.session_admins
        FOR SELECT
        USING (
            user_id = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()::text
            )
        );
END $$;

-- Session stakeholders table policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their stakeholder roles" ON public.session_stakeholders;
    
    -- Users can view their own stakeholder roles
    CREATE POLICY "Users can view their stakeholder roles" ON public.session_stakeholders
        FOR SELECT
        USING (
            user_email = (SELECT email FROM public.users WHERE id = auth.uid()::text)
            OR EXISTS (
                SELECT 1 FROM public.system_admins WHERE user_id = auth.uid()::text
            )
        );
END $$;

-- ============================================
-- NOTES
-- ============================================
-- 1. Leaked Password Protection (OPTIONAL - Pro plan only):
--    This is a Pro plan feature and is NOT required for the app to function.
--    If you have a Pro plan:
--    - Go to Authentication > Emails
--    - Scroll down to find "Prevent use of leaked passwords" section
--    - Toggle the switch to ON
--    - Click "Save"
--    Note: Since this app uses Azure AD OAuth, this feature doesn't apply anyway.
--    It only affects email/password authentication.
--
-- 2. RLS Policies:
--    The policies above are basic examples. You should review and customize them
--    based on your specific access requirements. Consider:
--    - Who can create records
--    - Who can update records
--    - Who can delete records
--    - Tenant isolation requirements
--
-- 3. Testing:
--    After applying this migration, test your application thoroughly to ensure
--    all access patterns work correctly with RLS enabled.

