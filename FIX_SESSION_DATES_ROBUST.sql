-- ============================================
-- Fix Session Dates - Robust Version with Temp Table
-- ============================================
-- This version uses a temporary table to ensure correct ordering
-- ============================================

-- Step 1: Create temp table with proper ordering
CREATE TEMP TABLE session_fix_order AS
SELECT 
    id,
    product_id,
    title,
    start_date,
    end_date,
    (end_date::DATE - start_date::DATE)::INTEGER as duration,
    ROW_NUMBER() OVER (
        PARTITION BY COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID)
        ORDER BY LEAST(start_date::DATE, end_date::DATE) ASC, id ASC
    ) as seq_num
FROM public.voting_sessions;

-- Step 2: Fix all sessions
DO $$
DECLARE
    session_rec RECORD;
    prev_end DATE;
    new_start TIMESTAMP;
    new_end TIMESTAMP;
    prod_id UUID;
BEGIN
    -- Process each product
    FOR prod_id IN 
        SELECT DISTINCT COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID)
        FROM session_fix_order
        ORDER BY COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID)
    LOOP
        RAISE NOTICE 'Processing product: %', prod_id;
        prev_end := NULL;
        
        -- Process sessions in sequence order
        FOR session_rec IN 
            SELECT * FROM session_fix_order
            WHERE COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID) = prod_id
            ORDER BY seq_num
        LOOP
            IF prev_end IS NULL THEN
                -- First session
                new_start := DATE_TRUNC('day', session_rec.start_date::DATE)::TIMESTAMP;
                new_end := (new_start::DATE + (session_rec.duration || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  [1] %: % -> %', session_rec.title, new_start::DATE, new_end::DATE;
            ELSE
                -- Subsequent: start day AFTER previous ends
                new_start := (prev_end + INTERVAL '1 day')::TIMESTAMP;
                new_end := (new_start::DATE + (session_rec.duration || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  [%] %: Previous ended %, New start % -> %', 
                    session_rec.seq_num, session_rec.title, prev_end, new_start::DATE, new_end::DATE;
                
                -- Verify
                IF prev_end >= new_start::DATE THEN
                    RAISE EXCEPTION 'ERROR: Session % would start % which is same/before previous end %', 
                        session_rec.id, new_start::DATE, prev_end;
                END IF;
            END IF;
            
            -- Update
            UPDATE public.voting_sessions
            SET start_date = new_start, end_date = new_end
            WHERE id = session_rec.id;
            
            prev_end := new_end::DATE;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Fix completed!';
END $$;

-- Step 3: Drop temp table
DROP TABLE session_fix_order;

-- Step 4: Verify - should return NO ROWS if fixed
SELECT 
    'VERIFICATION' as status,
    vs1.product_id,
    vs1.id as s1_id,
    vs1.title as s1_title,
    vs1.end_date::DATE as s1_ends,
    vs2.id as s2_id,
    vs2.title as s2_title,
    vs2.start_date::DATE as s2_starts,
    CASE 
        WHEN vs1.end_date::DATE = vs2.start_date::DATE THEN '❌ SAME DATE'
        WHEN vs1.end_date::DATE > vs2.start_date::DATE THEN '❌ OVERLAP'
        WHEN vs1.end_date::DATE + 1 = vs2.start_date::DATE THEN '✓ OK'
        ELSE '⚠️ GAP'
    END as result
FROM public.voting_sessions vs1
JOIN public.voting_sessions vs2 
    ON COALESCE(vs1.product_id, '00000000-0000-0000-0000-000000000000'::UUID) = 
       COALESCE(vs2.product_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND vs1.id < vs2.id
WHERE vs1.end_date::DATE >= vs2.start_date::DATE OR vs1.end_date::DATE + 1 != vs2.start_date::DATE
ORDER BY vs1.product_id, vs1.start_date;

