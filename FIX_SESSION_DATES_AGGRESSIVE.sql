-- ============================================
-- Fix Session Dates - Aggressive Version
-- ============================================
-- This script will FORCE all sessions to have proper spacing
-- It processes sessions multiple times if needed to ensure no overlaps
-- ============================================

-- Step 1: Show current problematic sessions
SELECT 
    'CURRENT ISSUES' as status,
    vs1.id as session1_id,
    vs1.title as session1_title,
    vs1.start_date::DATE as session1_start,
    vs1.end_date::DATE as session1_end,
    vs2.id as session2_id,
    vs2.title as session2_title,
    vs2.start_date::DATE as session2_start,
    vs2.end_date::DATE as session2_end,
    vs1.product_id,
    CASE 
        WHEN vs1.end_date::DATE = vs2.start_date::DATE THEN 'SAME DATE'
        WHEN vs1.end_date::DATE > vs2.start_date::DATE THEN 'OVERLAP'
        ELSE 'OTHER'
    END as issue_type
FROM public.voting_sessions vs1
INNER JOIN public.voting_sessions vs2 
    ON (vs1.product_id = vs2.product_id OR (vs1.product_id IS NULL AND vs2.product_id IS NULL))
    AND vs1.id < vs2.id
WHERE vs1.end_date::DATE >= vs2.start_date::DATE
ORDER BY vs1.product_id, vs1.start_date;

-- Step 2: Fix all sessions
DO $$
DECLARE
    session_record RECORD;
    prev_end_date DATE;
    new_start_date TIMESTAMP;
    new_end_date TIMESTAMP;
    session_duration_days INTEGER;
    product_id_val UUID;
    updated_count INTEGER;
BEGIN
    -- Loop through each product
    FOR product_id_val IN 
        SELECT DISTINCT product_id 
        FROM public.voting_sessions 
        WHERE product_id IS NOT NULL
        ORDER BY product_id
    LOOP
        RAISE NOTICE 'Processing product: %', product_id_val;
        
        prev_end_date := NULL;
        updated_count := 0;
    
        -- Get ALL sessions for this product, ordered by their CURRENT start_date
        -- We'll fix them sequentially
        FOR session_record IN 
            SELECT 
                id,
                title,
                start_date,
                end_date,
                (end_date::DATE - start_date::DATE)::INTEGER as duration
            FROM public.voting_sessions
            WHERE product_id = product_id_val
            ORDER BY start_date ASC, id ASC
        LOOP
            session_duration_days := session_record.duration;
            
            IF prev_end_date IS NULL THEN
                -- First session: set to start at midnight, end at 11:59:59 PM
                new_start_date := DATE_TRUNC('day', session_record.start_date::DATE)::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
            ELSE
                -- CRITICAL: Start the day AFTER previous session ends
                -- If prev_end_date is Nov 24, next session starts Nov 25
                new_start_date := (prev_end_date + INTERVAL '1 day')::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
            END IF;
            
            -- Update immediately
            UPDATE public.voting_sessions
            SET 
                start_date = new_start_date,
                end_date = new_end_date
            WHERE id = session_record.id;
            
            updated_count := updated_count + 1;
            prev_end_date := new_end_date::DATE;
        END LOOP;
        
        RAISE NOTICE '  Updated % sessions for product %', updated_count, product_id_val;
    END LOOP;
    
    -- Handle NULL product_id sessions
    IF EXISTS (SELECT 1 FROM public.voting_sessions WHERE product_id IS NULL) THEN
        RAISE NOTICE 'Processing sessions without product_id';
        prev_end_date := NULL;
        updated_count := 0;
        
        FOR session_record IN 
            SELECT 
                id,
                title,
                start_date,
                end_date,
                (end_date::DATE - start_date::DATE)::INTEGER as duration
            FROM public.voting_sessions
            WHERE product_id IS NULL
            ORDER BY start_date ASC, id ASC
        LOOP
            session_duration_days := session_record.duration;
            
            IF prev_end_date IS NULL THEN
                new_start_date := DATE_TRUNC('day', session_record.start_date::DATE)::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
            ELSE
                new_start_date := (prev_end_date + INTERVAL '1 day')::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
            END IF;
            
            UPDATE public.voting_sessions
            SET 
                start_date = new_start_date,
                end_date = new_end_date
            WHERE id = session_record.id;
            
            updated_count := updated_count + 1;
            prev_end_date := new_end_date::DATE;
        END LOOP;
        
        RAISE NOTICE '  Updated % sessions without product_id', updated_count;
    END IF;
    
    RAISE NOTICE 'Fix completed!';
END $$;

-- Step 3: Verify the fix worked
SELECT 
    'VERIFICATION' as status,
    vs1.id as session1_id,
    vs1.title as session1_title,
    vs1.start_date::DATE as session1_start,
    vs1.end_date::DATE as session1_end,
    vs2.id as session2_id,
    vs2.title as session2_title,
    vs2.start_date::DATE as session2_start,
    vs2.end_date::DATE as session2_end,
    vs1.product_id,
    CASE 
        WHEN vs1.end_date::DATE = vs2.start_date::DATE THEN '❌ SAME DATE'
        WHEN vs1.end_date::DATE > vs2.start_date::DATE THEN '❌ OVERLAP'
        WHEN vs1.end_date::DATE + 1 != vs2.start_date::DATE THEN '⚠️ GAP'
        ELSE '✓ OK'
    END as issue_type
FROM public.voting_sessions vs1
INNER JOIN public.voting_sessions vs2 
    ON (vs1.product_id = vs2.product_id OR (vs1.product_id IS NULL AND vs2.product_id IS NULL))
    AND vs1.id < vs2.id
WHERE 
    (vs1.end_date::DATE >= vs2.start_date::DATE OR vs1.end_date::DATE + 1 != vs2.start_date::DATE)
ORDER BY vs1.product_id, vs1.start_date;

-- Step 4: Show final state of all sessions
SELECT 
    'FINAL STATE' as status,
    product_id,
    id,
    title,
    start_date::DATE as start_date,
    end_date::DATE as end_date,
    start_date::TIME as start_time,
    end_date::TIME as end_time,
    (end_date::DATE - start_date::DATE)::INTEGER as duration_days
FROM public.voting_sessions
ORDER BY 
    COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID),
    start_date ASC;

