-- ============================================
-- CLEAN FIX FOR USERS TABLE RLS
-- ============================================
-- This script drops ALL existing policies and creates clean ones
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop ALL existing policies (complete clean slate)
DROP POLICY IF EXISTS "Users can read users table" ON public.users;
DROP POLICY IF EXISTS "Users can insert into users table" ON public.users;
DROP POLICY IF EXISTS "Users can update users table" ON public.users;
DROP POLICY IF EXISTS "Anyone can read users" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Anyone can update users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated access to users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can access users table" ON public.users;
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 3: Create simple, permissive policies that allow anonymous access
-- In Supabase, anonymous users have role 'anon', authenticated users have role 'authenticated'
-- We need to explicitly allow both roles

-- SELECT: Allow anyone (including anonymous) to read
CREATE POLICY "Anyone can read users" ON public.users
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- INSERT: Allow anyone (including anonymous) to insert
CREATE POLICY "Anyone can insert users" ON public.users
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- UPDATE: Allow anyone (including anonymous) to update
CREATE POLICY "Anyone can update users" ON public.users
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Step 4: Verify policies were created correctly
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NULL THEN 'NULL'
        ELSE 'Has USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NULL THEN 'NULL'
        ELSE 'Has WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

