-- Expose users table to PostgREST API
-- This script ensures the table is accessible via Supabase's REST API

-- 1. Make sure the table is in the public schema (it is)
-- 2. Grant permissions to the special roles that PostgREST uses
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- 3. Make sure RLS is properly configured
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies and create fresh ones
DROP POLICY IF EXISTS "authenticated_all_access" ON public.users;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can insert users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON public.users;

-- 5. Create permissive policies for all operations
CREATE POLICY "Enable read access for authenticated users" 
ON public.users FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
ON public.users FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" 
ON public.users FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Enable delete access for authenticated users" 
ON public.users FOR DELETE 
TO authenticated 
USING (true);

-- 6. Verify the setup
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies
WHERE tablename = 'users';
