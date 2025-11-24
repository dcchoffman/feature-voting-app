-- ============================================
-- CHECK FOR DATABASE TRIGGERS OR FUNCTIONS
-- ============================================
-- This script checks for triggers or functions on the users table
-- that might be causing queries to hang
-- ============================================

-- Check for triggers on users table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;

-- Check if users is a view or table
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name = 'users';

-- Check for views that might be causing issues
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE '%user%';

-- Check for functions that might be called by triggers
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (
    p.proname LIKE '%user%' 
    OR p.proname LIKE '%created%'
    OR p.proname LIKE '%updated%'
)
ORDER BY p.proname;

-- Check if there are any indexes that might be causing issues
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'users'
ORDER BY indexname;

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

