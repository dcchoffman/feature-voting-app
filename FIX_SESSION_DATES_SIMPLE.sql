-- ============================================
-- Fix Session Dates - Simple & Direct
-- ============================================
-- This script directly updates all sessions in one pass
-- ============================================

-- First, let's see what we have
SELECT 
    product_id,
    id,
    title,
    start_date::DATE as start,
    end_date::DATE as end,
    (end_date::DATE - start_date::DATE)::INTEGER as days
FROM public.voting_sessions
ORDER BY COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID), start_date;

-- Now fix them
DO $$
DECLARE
    r RECORD;
    prev_end DATE;
    new_start TIMESTAMP;
    new_end TIMESTAMP;
    dur INTEGER;
    prod_id UUID;
BEGIN
    -- For each product
    FOR prod_id IN 
        SELECT DISTINCT COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID) as pid
        FROM public.voting_sessions
        ORDER BY pid
    LOOP
        prev_end := NULL;
        
        -- Get sessions for this product, ordered by earliest date
        FOR r IN 
            SELECT 
                id,
                title,
                start_date,
                end_date,
                (end_date::DATE - start_date::DATE)::INTEGER as duration
            FROM public.voting_sessions
            WHERE COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID) = prod_id
            ORDER BY LEAST(start_date::DATE, end_date::DATE), id
        LOOP
            dur := r.duration;
            
            IF prev_end IS NULL THEN
                -- First session: normalize to midnight start, 11:59:59 PM end
                new_start := DATE_TRUNC('day', r.start_date::DATE);
                new_end := new_start::DATE + (dur || ' days')::INTERVAL + '23:59:59'::INTERVAL;
            ELSE
                -- Next session: start the day AFTER previous ends
                new_start := (prev_end + INTERVAL '1 day')::TIMESTAMP;
                new_end := new_start::DATE + (dur || ' days')::INTERVAL + '23:59:59'::INTERVAL;
            END IF;
            
            -- Update
            UPDATE public.voting_sessions
            SET start_date = new_start, end_date = new_end
            WHERE id = r.id;
            
            prev_end := new_end::DATE;
        END LOOP;
    END LOOP;
END $$;

-- Verify
SELECT 
    vs1.product_id,
    vs1.title as s1_title,
    vs1.end_date::DATE as s1_end,
    vs2.title as s2_title,
    vs2.start_date::DATE as s2_start,
    CASE 
        WHEN vs1.end_date::DATE = vs2.start_date::DATE THEN 'SAME DATE ❌'
        WHEN vs1.end_date::DATE > vs2.start_date::DATE THEN 'OVERLAP ❌'
        WHEN vs1.end_date::DATE + 1 = vs2.start_date::DATE THEN 'OK ✓'
        ELSE 'GAP ⚠️'
    END as status
FROM public.voting_sessions vs1
JOIN public.voting_sessions vs2 
    ON COALESCE(vs1.product_id, '00000000-0000-0000-0000-000000000000'::UUID) = 
       COALESCE(vs2.product_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND vs1.id < vs2.id
WHERE vs1.end_date::DATE >= vs2.start_date::DATE OR vs1.end_date::DATE + 1 != vs2.start_date::DATE
ORDER BY vs1.product_id, vs1.start_date;

