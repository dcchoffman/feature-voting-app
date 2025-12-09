-- Diagnostic script to check users table status

-- 1. Check if table exists and in which schema
SELECT schemaname, tablename, tableowner 
FROM pg_tables 
WHERE tablename = 'users';

-- 2. Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- 4. Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'users';

-- 5. Check permissions
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_schema = 'public' AND table_name = 'users';

-- 6. Try to select from the table
SELECT COUNT(*) as user_count FROM public.users;

-- 7. Check if table is exposed via PostgREST (API)
-- This shows tables available via the API
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';
