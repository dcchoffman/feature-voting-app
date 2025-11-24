-- ============================================
-- FIX USERS TABLE RLS - Quick Fix for Login Hanging
-- ============================================
-- This ensures the users table has the correct RLS policies
-- Run this in Supabase SQL Editor if login is hanging
-- ============================================

-- First, ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (in case they're conflicting)
DROP POLICY IF EXISTS "Users can read users table" ON public.users;
DROP POLICY IF EXISTS "Users can insert into users table" ON public.users;
DROP POLICY IF EXISTS "Users can update users table" ON public.users;
DROP POLICY IF EXISTS "Anyone can read users" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Anyone can update users" ON public.users;

-- Create simple, permissive policies
-- SELECT: Allow anyone to read (needed for email/name login)
CREATE POLICY "Anyone can read users" ON public.users
    FOR SELECT
    USING (true);

-- INSERT: Allow anyone to insert (needed for email/name login to create users)
CREATE POLICY "Anyone can insert users" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- UPDATE: Allow anyone to update (for flexibility)
CREATE POLICY "Anyone can update users" ON public.users
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Verify the policies were created
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

