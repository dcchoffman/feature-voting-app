-- ============================================================================
-- Script to Assign Random Hex Colors to Products Without Colors
-- ============================================================================

-- ============================================================================
-- STEP 1: Preview products without color_hex
-- ============================================================================
SELECT 
    id,
    name,
    tenant_id,
    color_hex,
    created_at,
    'NEEDS COLOR' as status
FROM products
WHERE color_hex IS NULL OR color_hex = ''
ORDER BY name;

-- ============================================================================
-- STEP 2: Assign random hex colors to products without colors
-- ============================================================================
-- This generates a random hex color in the format #RRGGBB
UPDATE products
SET color_hex = '#' || 
    LPAD(TO_HEX(FLOOR(RANDOM() * 256)::INT), 2, '0') ||
    LPAD(TO_HEX(FLOOR(RANDOM() * 256)::INT), 2, '0') ||
    LPAD(TO_HEX(FLOOR(RANDOM() * 256)::INT), 2, '0')
WHERE color_hex IS NULL OR color_hex = '';

-- ============================================================================
-- STEP 3: Alternative - Assign from a predefined color palette
-- ============================================================================
-- If you prefer predefined colors instead of random, uncomment this section
-- and comment out Step 2
/*
UPDATE products
SET color_hex = (
    SELECT color FROM (
        VALUES 
            ('#076447'),  -- Green
            ('#2D4660'),  -- Blue
            ('#C89212'),  -- Gold
            ('#8B4513'),  -- Brown
            ('#4B0082'),  -- Indigo
            ('#FF6347'),  -- Tomato
            ('#20B2AA'),  -- Light Sea Green
            ('#FF8C00'),  -- Dark Orange
            ('#9370DB'),  -- Medium Purple
            ('#00CED1'),  -- Dark Turquoise
            ('#FF1493'),  -- Deep Pink
            ('#32CD32')   -- Lime Green
    ) AS colors(color)
    ORDER BY RANDOM()
    LIMIT 1
)
WHERE color_hex IS NULL OR color_hex = '';
*/

-- ============================================================================
-- STEP 4: Alternative - Assign colors in rotation from a palette
-- ============================================================================
-- This assigns colors in order, cycling through the palette
-- Uncomment if you want consistent color assignment
/*
WITH color_palette AS (
    SELECT unnest(ARRAY[
        '#076447',  -- Green
        '#2D4660',  -- Blue
        '#C89212',  -- Gold
        '#8B4513',  -- Brown
        '#4B0082',  -- Indigo
        '#FF6347',  -- Tomato
        '#20B2AA',  -- Light Sea Green
        '#FF8C00',  -- Dark Orange
        '#9370DB',  -- Medium Purple
        '#00CED1',  -- Dark Turquoise
        '#FF1493',  -- Deep Pink
        '#32CD32'   -- Lime Green
    ]) AS color
),
products_needing_color AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name) - 1 AS row_num
    FROM products
    WHERE color_hex IS NULL OR color_hex = ''
)
UPDATE products p
SET color_hex = (
    SELECT color 
    FROM color_palette 
    OFFSET (SELECT row_num FROM products_needing_color WHERE id = p.id) % (SELECT COUNT(*) FROM color_palette)
    LIMIT 1
)
WHERE p.color_hex IS NULL OR p.color_hex = '';
*/

-- ============================================================================
-- STEP 5: Verify color assignments
-- ============================================================================
SELECT 
    id,
    name,
    tenant_id,
    color_hex,
    created_at,
    CASE 
        WHEN color_hex IS NULL OR color_hex = '' THEN 'STILL NEEDS COLOR'
        ELSE 'HAS COLOR'
    END as status
FROM products
ORDER BY name;

-- Count products with and without colors
SELECT 
    COUNT(*) as total_products,
    COUNT(color_hex) as products_with_color,
    COUNT(*) - COUNT(color_hex) as products_without_color
FROM products;

