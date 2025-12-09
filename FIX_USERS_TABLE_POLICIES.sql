-- Fix policies for existing users table
-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can insert users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON public.users;
DROP POLICY IF EXISTS "Users can read users table" ON public.users;
DROP POLICY IF EXISTS "Users can insert into users table" ON public.users;
DROP POLICY IF EXISTS "Users can update users table" ON public.users;

-- Disable RLS temporarily to test
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create a single permissive policy that allows everything for authenticated users
CREATE POLICY "authenticated_all_access" 
ON public.users 
FOR ALL
TO authenticated 
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.users TO anon;

-- Verify the setup
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';
