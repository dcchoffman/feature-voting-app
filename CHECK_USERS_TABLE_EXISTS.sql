-- ============================================
-- CHECK IF public.users TABLE EXISTS
-- ============================================
-- This script verifies that the public.users table exists
-- and shows its structure
-- ============================================

-- Check if public.users table exists
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name = 'users';

-- If it exists, show its columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'users'
ORDER BY ordinal_position;

-- Check if there's confusion with auth.users
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'users'
ORDER BY table_schema, table_name;

-- Count rows in public.users (if it exists)
SELECT COUNT(*) as row_count FROM public.users;

