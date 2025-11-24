-- ============================================
-- TEMPORARY: Disable RLS to fix app issues
-- ============================================
-- Run this if RLS policies are blocking your app from working.
-- This will disable RLS on all tables so your app can function.
-- WARNING: This reduces security - only use temporarily!
-- ============================================

-- Disable RLS on all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_stakeholders DISABLE ROW LEVEL SECURITY;

-- Disable RLS on other tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voting_sessions') THEN
        ALTER TABLE public.voting_sessions DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'features') THEN
        ALTER TABLE public.features DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'votes') THEN
        ALTER TABLE public.votes DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_status_notes') THEN
        ALTER TABLE public.session_status_notes DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'azure_devops_config') THEN
        ALTER TABLE public.azure_devops_config DISABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'info_requests') THEN
        ALTER TABLE public.info_requests DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

