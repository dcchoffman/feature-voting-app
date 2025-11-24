-- ============================================
-- UPDATE RLS POLICIES - Fix Login Issues
-- ============================================
-- Run this AFTER running fix_security_issues_permissive.sql
-- This updates the policies to allow anonymous access for email/name login
-- ============================================

-- Users table policies - Allow anonymous access for email/name login
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can read users table" ON public.users;
    DROP POLICY IF EXISTS "Users can insert into users table" ON public.users;
    DROP POLICY IF EXISTS "Users can update users table" ON public.users;
    
    -- Allow SELECT for anyone (needed for email/name login)
    CREATE POLICY "Users can read users table" ON public.users
        FOR SELECT
        USING (true);
    
    -- Allow INSERT for anyone (needed for email/name login to create users)
    CREATE POLICY "Users can insert into users table" ON public.users
        FOR INSERT
        WITH CHECK (true);
    
    -- Allow UPDATE for anyone (needed for flexibility)
    CREATE POLICY "Users can update users table" ON public.users
        FOR UPDATE
        USING (true)
        WITH CHECK (true);
END $$;

-- Products table policies - Allow anonymous read
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can read products" ON public.products;
    DROP POLICY IF EXISTS "Authenticated users can write products" ON public.products;
    
    CREATE POLICY "Anyone can read products" ON public.products
        FOR SELECT
        USING (true);
    
    CREATE POLICY "Authenticated users can write products" ON public.products
        FOR ALL
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
END $$;

-- System admins table policies - Allow anonymous read
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can read system admins" ON public.system_admins;
    DROP POLICY IF EXISTS "Authenticated users can write system admins" ON public.system_admins;
    
    CREATE POLICY "Anyone can read system admins" ON public.system_admins
        FOR SELECT
        USING (true);
    
    CREATE POLICY "Authenticated users can write system admins" ON public.system_admins
        FOR ALL
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
END $$;

-- Session admins table policies - Allow anonymous read
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can read session admins" ON public.session_admins;
    DROP POLICY IF EXISTS "Authenticated users can write session admins" ON public.session_admins;
    
    CREATE POLICY "Anyone can read session admins" ON public.session_admins
        FOR SELECT
        USING (true);
    
    CREATE POLICY "Authenticated users can write session admins" ON public.session_admins
        FOR ALL
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
END $$;

-- Session stakeholders table policies - Allow anonymous read
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can read session stakeholders" ON public.session_stakeholders;
    DROP POLICY IF EXISTS "Authenticated users can write session stakeholders" ON public.session_stakeholders;
    
    CREATE POLICY "Anyone can read session stakeholders" ON public.session_stakeholders
        FOR SELECT
        USING (true);
    
    CREATE POLICY "Authenticated users can write session stakeholders" ON public.session_stakeholders
        FOR ALL
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
END $$;

-- Voting sessions table policies - Allow anonymous read
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'voting_sessions') THEN
        DROP POLICY IF EXISTS "Anyone can read voting sessions" ON public.voting_sessions;
        DROP POLICY IF EXISTS "Authenticated users can write voting sessions" ON public.voting_sessions;
        
        CREATE POLICY "Anyone can read voting sessions" ON public.voting_sessions
            FOR SELECT
            USING (true);
        
        CREATE POLICY "Authenticated users can write voting sessions" ON public.voting_sessions
            FOR ALL
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Features table policies - Allow anonymous read
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'features') THEN
        DROP POLICY IF EXISTS "Anyone can read features" ON public.features;
        DROP POLICY IF EXISTS "Authenticated users can write features" ON public.features;
        
        CREATE POLICY "Anyone can read features" ON public.features
            FOR SELECT
            USING (true);
        
        CREATE POLICY "Authenticated users can write features" ON public.features
            FOR ALL
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- Votes table policies - Allow anonymous read/write (needed for email/name login to vote)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'votes') THEN
        DROP POLICY IF EXISTS "Anyone can access votes" ON public.votes;
        
        CREATE POLICY "Anyone can access votes" ON public.votes
            FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

