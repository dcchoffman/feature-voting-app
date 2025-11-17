-- Migration Script: Update all sessions to use product_id from products table
-- This ensures the products table is the single source of truth for product names

-- ============================================================================
-- STEP 1: Preview - See what product names exist in sessions
-- ============================================================================
SELECT DISTINCT 
    vs.product_name,
    COUNT(*) as session_count,
    COUNT(vs.product_id) as sessions_with_product_id,
    COUNT(*) - COUNT(vs.product_id) as sessions_needing_update
FROM voting_sessions vs
WHERE vs.product_name IS NOT NULL 
    AND vs.product_name != ''
GROUP BY vs.product_name
ORDER BY vs.product_name;

-- ============================================================================
-- STEP 2: Find product names in sessions that don't exist in products table
-- ============================================================================
SELECT DISTINCT 
    vs.product_name as missing_product_name,
    COUNT(*) as session_count
FROM voting_sessions vs
WHERE vs.product_name IS NOT NULL 
    AND vs.product_name != ''
    AND vs.product_name NOT IN (
        SELECT name FROM products WHERE name IS NOT NULL
    )
GROUP BY vs.product_name
ORDER BY vs.product_name;

-- ============================================================================
-- STEP 3: Create missing products in products table
-- This matches products by name and creates them if they don't exist
-- NOTE: You may need to adjust tenant_id logic based on your schema
-- ============================================================================
-- Option A: If you know the tenant_id, replace 'YOUR_TENANT_ID' with the actual tenant_id
INSERT INTO products (name, tenant_id, created_at)
SELECT DISTINCT 
    vs.product_name as name,
    'YOUR_TENANT_ID'::uuid as tenant_id,  -- REPLACE WITH YOUR ACTUAL TENANT_ID
    NOW() as created_at
FROM voting_sessions vs
WHERE vs.product_name IS NOT NULL 
    AND vs.product_name != ''
    AND vs.product_name NOT IN (
        SELECT name FROM products WHERE name IS NOT NULL
    )
ON CONFLICT DO NOTHING;

-- Option B: If sessions are linked to users/tenants through session_admins, use this:
-- INSERT INTO products (name, tenant_id, created_at)
-- SELECT DISTINCT 
--     vs.product_name as name,
--     u.tenant_id,
--     NOW() as created_at
-- FROM voting_sessions vs
-- JOIN session_admins sa ON sa.session_id = vs.id
-- JOIN users u ON u.id = sa.user_id
-- WHERE vs.product_name IS NOT NULL 
--     AND vs.product_name != ''
--     AND vs.product_name NOT IN (
--         SELECT name FROM products WHERE name IS NOT NULL
--     )
--     AND u.tenant_id IS NOT NULL
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: Update all sessions to set product_id based on product_name match
-- This is the main migration step
-- ============================================================================
UPDATE voting_sessions vs
SET product_id = p.id
FROM products p
WHERE vs.product_name = p.name
    AND (vs.product_id IS NULL OR vs.product_id != p.id)
    AND vs.product_name IS NOT NULL
    AND vs.product_name != '';

-- ============================================================================
-- STEP 5: Clear product_name from sessions (set to NULL)
-- This ensures all product names come from the products table
-- ============================================================================
UPDATE voting_sessions
SET product_name = NULL
WHERE product_id IS NOT NULL;

-- ============================================================================
-- STEP 6: Verification Queries
-- ============================================================================

-- Check migration results
SELECT 
    COUNT(*) as total_sessions,
    COUNT(product_id) as sessions_with_product_id,
    COUNT(product_name) as sessions_still_with_product_name,
    COUNT(*) - COUNT(product_id) as sessions_missing_product_id
FROM voting_sessions;

-- Show sessions that still need attention (have product_name but no product_id)
SELECT 
    id,
    title,
    product_name,
    product_id,
    CASE 
        WHEN product_id IS NULL AND product_name IS NOT NULL THEN 'NEEDS ATTENTION'
        WHEN product_id IS NOT NULL THEN 'OK'
        ELSE 'NO PRODUCT'
    END as status
FROM voting_sessions
WHERE product_name IS NOT NULL AND product_id IS NULL
ORDER BY product_name;

-- Show all products and how many sessions use them
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
-- STEP 7: (OPTIONAL) After verification, you can drop the product_name column
-- WARNING: Only do this after verifying everything works correctly!
-- ============================================================================
-- ALTER TABLE voting_sessions DROP COLUMN product_name;

