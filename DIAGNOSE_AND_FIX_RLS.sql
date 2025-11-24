-- ============================================
-- DIAGNOSE AND FIX RLS ISSUES
-- ============================================
-- This script will diagnose and fix RLS issues on the users table
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- Step 2: List all existing policies on users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- Step 3: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Users can read users table" ON public.users;
DROP POLICY IF EXISTS "Users can insert into users table" ON public.users;
DROP POLICY IF EXISTS "Users can update users table" ON public.users;
DROP POLICY IF EXISTS "Anyone can read users" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Anyone can update users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can insert users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON public.users;

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple, permissive policies
-- These allow ANYONE (including anonymous users) to access the table
-- This is needed for email/name login which doesn't use Supabase auth

-- SELECT policy: Allow anyone to read
CREATE POLICY "Anyone can read users" ON public.users
    FOR SELECT
    USING (true);

-- INSERT policy: Allow anyone to insert (needed to create new users)
CREATE POLICY "Anyone can insert users" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- UPDATE policy: Allow anyone to update
CREATE POLICY "Anyone can update users" ON public.users
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Step 6: Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NULL THEN 'No USING clause'
        ELSE 'Has USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NULL THEN 'No WITH CHECK clause'
        ELSE 'Has WITH CHECK clause'
    END as with_check_clause
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- Step 7: Test query (this should work now)
-- Uncomment the line below to test if you can read from the table
-- SELECT COUNT(*) FROM public.users;

