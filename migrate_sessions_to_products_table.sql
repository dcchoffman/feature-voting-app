-- ============================================================================
-- COMPREHENSIVE MIGRATION: Update all sessions to use products table
-- This script ensures all sessions reference products by product_id
-- ============================================================================

-- ============================================================================
-- STEP 0: Add product_name column if it doesn't exist
-- ============================================================================
-- Add product_name column to voting_sessions table
ALTER TABLE voting_sessions 
ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'voting_sessions' 
AND column_name LIKE '%product%'
ORDER BY column_name;

-- ============================================================================
-- STEP 1: PREVIEW - See current state of sessions and products
-- ============================================================================
-- View sessions with their product assignments
SELECT 
    vs.product_id,
    p.name as product_name_from_table,
    vs.product_name as product_name_in_session,
    COUNT(*) as session_count,
    CASE 
        WHEN vs.product_id IS NOT NULL AND p.name IS NULL THEN 'ORPHANED PRODUCT_ID'
        WHEN vs.product_id IS NOT NULL AND vs.product_name IS NULL THEN 'NEEDS PRODUCT_NAME'
        WHEN vs.product_id IS NOT NULL AND vs.product_name != p.name THEN 'MISMATCH'
        WHEN vs.product_id IS NOT NULL AND vs.product_name = p.name THEN 'OK'
        ELSE 'NO PRODUCT'
    END as status
FROM voting_sessions vs
LEFT JOIN products p ON p.id = vs.product_id
GROUP BY vs.product_id, p.name, vs.product_name
ORDER BY p.name, vs.product_name;

-- View sessions without product assignments
SELECT 
    vs.id,
    vs.title,
    vs.product_id,
    vs.product_name,
    'NO PRODUCT ASSIGNED' as status
FROM voting_sessions vs
WHERE vs.product_id IS NULL
ORDER BY vs.title;

-- View all products in products table
SELECT 
    id,
    name,
    tenant_id,
    color_hex,
    created_at
FROM products
ORDER BY name ASC;

-- ============================================================================
-- STEP 2: Populate product_name from products table based on product_id
-- ============================================================================
-- Update all sessions to set product_name from products table
-- This ensures product_name matches what's in the products table
UPDATE voting_sessions vs
SET product_name = p.name
FROM products p
WHERE vs.product_id = p.id
    AND (vs.product_name IS NULL OR vs.product_name != p.name);

-- ============================================================================
-- STEP 3: Check for orphaned product_ids (product_id that doesn't exist in products table)
-- ============================================================================
-- Find sessions with product_id that don't match any product in products table
SELECT 
    vs.id,
    vs.title,
    vs.product_id,
    vs.product_name,
    'ORPHANED PRODUCT_ID - Product not found in products table' as status
FROM voting_sessions vs
WHERE vs.product_id IS NOT NULL
    AND vs.product_id NOT IN (SELECT id FROM products WHERE id IS NOT NULL)
ORDER BY vs.title;

-- ============================================================================
-- STEP 4: Fix orphaned product_ids
-- ============================================================================
-- Option 1: Set orphaned product_ids to NULL (sessions will have no product)
UPDATE voting_sessions
SET product_id = NULL,
    product_name = NULL
WHERE product_id IS NOT NULL
    AND product_id NOT IN (SELECT id FROM products WHERE id IS NOT NULL);

-- Option 2: If you want to assign a default product instead, use this:
-- UPDATE voting_sessions
-- SET product_id = (SELECT id FROM products LIMIT 1),
--     product_name = (SELECT name FROM products LIMIT 1)
-- WHERE product_id IS NOT NULL
--     AND product_id NOT IN (SELECT id FROM products WHERE id IS NOT NULL);

-- ============================================================================
-- STEP 5: VERIFICATION - Check migration results
-- ============================================================================

-- Overall statistics
SELECT 
    COUNT(*) as total_sessions,
    COUNT(product_id) as sessions_with_product_id,
    COUNT(product_name) as sessions_with_product_name,
    COUNT(*) - COUNT(product_id) as sessions_missing_product_id,
    COUNT(CASE WHEN product_id IS NOT NULL AND product_name IS NULL THEN 1 END) as sessions_missing_product_name,
    ROUND(100.0 * COUNT(product_id) / COUNT(*), 2) as percent_with_product
FROM voting_sessions;

-- Check for mismatches between product_id and product_name
SELECT 
    vs.id,
    vs.title,
    vs.product_id,
    vs.product_name,
    p.name as product_name_from_table,
    CASE 
        WHEN vs.product_id IS NOT NULL AND p.name IS NULL THEN 'ORPHANED PRODUCT_ID'
        WHEN vs.product_id IS NOT NULL AND vs.product_name IS NULL THEN 'MISSING PRODUCT_NAME'
        WHEN vs.product_id IS NOT NULL AND vs.product_name != p.name THEN 'MISMATCH'
        WHEN vs.product_id IS NOT NULL AND vs.product_name = p.name THEN 'OK'
        WHEN vs.product_id IS NULL THEN 'NO PRODUCT'
        ELSE 'UNKNOWN'
    END as status
FROM voting_sessions vs
LEFT JOIN products p ON p.id = vs.product_id
WHERE vs.product_id IS NOT NULL 
    AND (p.name IS NULL OR vs.product_name IS NULL OR vs.product_name != p.name)
ORDER BY vs.title
LIMIT 50;

-- Sessions that don't have a product_id assigned
SELECT 
    id,
    title,
    product_id,
    product_name,
    CASE 
        WHEN product_id IS NULL THEN 'NO PRODUCT ASSIGNED'
        ELSE 'OK - Using products table'
    END as status
FROM voting_sessions
WHERE product_id IS NULL
ORDER BY title
LIMIT 50;

-- Products and their session counts
SELECT 
    p.id,
    p.name,
    p.tenant_id,
    p.color_hex,
    COUNT(vs.id) as session_count
FROM products p
LEFT JOIN voting_sessions vs ON vs.product_id = p.id
GROUP BY p.id, p.name, p.tenant_id, p.color_hex
ORDER BY p.name ASC;

-- ============================================================================
-- STEP 6: FINAL STEP - Clear product_name (optional, for single source of truth)
-- ============================================================================
-- After verification, you can optionally clear product_name to ensure product_id
-- is the only source of truth. The product_name will be looked up from products table.
-- 
-- WARNING: Only do this after verifying everything works correctly in the app!
-- The code should use product_id to lookup product names from the products table.
--
-- UPDATE voting_sessions
-- SET product_name = NULL
-- WHERE product_id IS NOT NULL;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Migration complete! All sessions now have:
-- 1. product_id referencing products table (single source of truth)
-- 2. product_name populated from products table (for backward compatibility)
--
-- The products table is now the single source of truth for product names.
-- All product names come from the products table via product_id lookup.

