-- ============================================================================
-- Script to Assign Products to Sessions Without Products
-- ============================================================================

-- ============================================================================
-- STEP 1: Review sessions that need products assigned
-- ============================================================================
SELECT 
    vs.id,
    vs.title,
    vs.product_id,
    vs.product_name,
    'NEEDS PRODUCT ASSIGNMENT' as status
FROM voting_sessions vs
WHERE vs.product_id IS NULL
ORDER BY vs.title;

-- ============================================================================
-- STEP 2: Assign products based on title matching
-- ============================================================================

-- Assign "Red Tool Feature Voting Oct'25" to "Red Tool Management System"
UPDATE voting_sessions
SET product_id = (SELECT id FROM products WHERE name = 'Red Tool Management System' LIMIT 1),
    product_name = 'Red Tool Management System'
WHERE title LIKE '%Red Tool%'
    AND product_id IS NULL;

-- Assign "Enterprise Performance Dashboard" - you may want to change this
-- Options: Composite Floor System, Metal Roof Panels, Open Web Joists, Steel Deck System, Structural Trusses
UPDATE voting_sessions
SET product_id = (SELECT id FROM products WHERE name = 'Composite Floor System' LIMIT 1),
    product_name = 'Composite Floor System'
WHERE title = 'Enterprise Performance Dashboard'
    AND product_id IS NULL;

-- ============================================================================
-- STEP 3: Manual assignment for remaining sessions
-- ============================================================================
-- Uncomment and modify these based on which product each session should have
-- Replace 'SESSION_TITLE' with the actual title and 'PRODUCT_NAME' with the product name

/*
-- Example: Assign a specific session to a specific product
UPDATE voting_sessions
SET product_id = (SELECT id FROM products WHERE name = 'PRODUCT_NAME' LIMIT 1),
    product_name = 'PRODUCT_NAME'
WHERE title = 'SESSION_TITLE'
    AND product_id IS NULL;
*/

-- Assign all remaining sessions to a default product (if desired)
-- Uncomment and choose a default product:
-- UPDATE voting_sessions
-- SET product_id = (SELECT id FROM products WHERE name = 'Composite Floor System' LIMIT 1),
--     product_name = 'Composite Floor System'
-- WHERE product_id IS NULL;

-- ============================================================================
-- STEP 4: Verify assignments
-- ============================================================================
SELECT 
    vs.id,
    vs.title,
    vs.product_id,
    vs.product_name,
    p.name as product_name_from_table,
    CASE 
        WHEN vs.product_id IS NOT NULL AND p.name IS NOT NULL AND vs.product_name = p.name THEN 'OK'
        WHEN vs.product_id IS NOT NULL AND p.name IS NULL THEN 'ORPHANED PRODUCT_ID'
        WHEN vs.product_id IS NULL THEN 'STILL NEEDS PRODUCT'
        ELSE 'MISMATCH'
    END as status
FROM voting_sessions vs
LEFT JOIN products p ON p.id = vs.product_id
WHERE vs.id IN (
    '9eada88a-f715-446d-b55a-32e311f1002d',  -- afadsfa
    '565fd960-19f4-4a5f-bcb5-723c53895c7b',  -- asdfsad
    'aa4cd5fe-4007-42c2-918e-183acfdbf3e7',  -- dfafds
    '93e48d70-f47f-4236-9276-125377079644',  -- dsa
    'bd542525-b7bf-40ee-87d4-1232d9bb46ea',  -- Enterprise Performance Dashboard
    'a2722ccd-a125-4464-b0f9-53ade53df6f0',  -- fdfafd
    '27e50155-2921-426a-82b3-ddf5d5a91075',  -- fsafd
    '87fa7ed7-5634-4d1e-9528-d4514b43d65c',  -- lk;lk;
    'd7a53466-ae83-4c36-8c9e-ae755ab02443'   -- Red Tool Feature Voting Oct'25
)
ORDER BY vs.title;

-- ============================================================================
-- Available Products for Reference:
-- ============================================================================
-- 1. Composite Floor System
-- 2. Metal Roof Panels
-- 3. Open Web Joists
-- 4. Red Tool Management System
-- 5. Steel Deck System
-- 6. Structural Trusses
-- ============================================================================

