-- List all product names from the products table
-- This query shows all products with their IDs and names, ordered alphabetically

SELECT 
    id,
    name,
    tenant_id,
    color_hex,
    created_at
FROM products
ORDER BY name ASC;

-- If you only want the product names (without other columns):
-- SELECT DISTINCT name
-- FROM products
-- WHERE name IS NOT NULL
-- ORDER BY name ASC;

-- If you want to see products grouped by tenant:
-- SELECT 
--     tenant_id,
--     name,
--     COUNT(*) as session_count
-- FROM products
-- GROUP BY tenant_id, name
-- ORDER BY tenant_id, name ASC;

