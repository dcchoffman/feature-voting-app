-- ============================================
-- Fix Session Dates - Final Version
-- ============================================
-- This script ensures that:
-- 1. Sessions NEVER end and start on the same day
-- 2. Each session starts the day AFTER the previous session ends
-- 3. Start dates are at midnight (00:00:00)
-- 4. End dates are at 11:59:59 PM (23:59:59)
-- ============================================

-- First, show current state
SELECT 
    'BEFORE FIX' as status,
    product_id,
    id,
    title,
    start_date,
    end_date,
    start_date::DATE as start_date_only,
    end_date::DATE as end_date_only
FROM public.voting_sessions
ORDER BY 
    COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID),
    start_date ASC;

DO $$
DECLARE
    session_record RECORD;
    prev_end_date DATE := NULL;
    new_start_date TIMESTAMP;
    new_end_date TIMESTAMP;
    session_duration_days INTEGER;
    product_id_val UUID;
    session_num INTEGER;
BEGIN
    -- Loop through each product
    FOR product_id_val IN 
        SELECT DISTINCT product_id 
        FROM public.voting_sessions 
        WHERE product_id IS NOT NULL
        ORDER BY product_id
    LOOP
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Processing product: %', product_id_val;
        RAISE NOTICE '========================================';
        
        -- Reset for each product
        prev_end_date := NULL;
        session_num := 0;
    
        -- Process sessions for this product, ordered by original start_date
        FOR session_record IN 
            SELECT 
                id,
                title,
                start_date,
                end_date,
                product_id,
                (end_date::DATE - start_date::DATE)::INTEGER as duration
            FROM public.voting_sessions
            WHERE product_id = product_id_val
            ORDER BY start_date ASC, id ASC
        LOOP
            session_num := session_num + 1;
            session_duration_days := session_record.duration;
            
            RAISE NOTICE '--- Session %: % (ID: %) ---', session_num, session_record.title, session_record.id;
            RAISE NOTICE '  Original: Start=% End=% Duration=% days', 
                session_record.start_date::DATE, 
                session_record.end_date::DATE,
                session_duration_days;
            
            -- If this is the first session for this product
            IF prev_end_date IS NULL THEN
                -- First session: keep start date, fix times
                new_start_date := DATE_TRUNC('day', session_record.start_date::DATE)::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23 hours 59 minutes 59 seconds'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  [FIRST] Setting: Start=% End=%', 
                    new_start_date, 
                    new_end_date;
            ELSE
                -- Subsequent sessions: MUST start the day AFTER previous ends
                -- prev_end_date is a DATE (e.g., Nov 24)
                -- Adding 1 day gives us Nov 25 at midnight
                new_start_date := (prev_end_date + INTERVAL '1 day')::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23 hours 59 minutes 59 seconds'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  [SUBSEQUENT] Previous ended on: %', prev_end_date;
                RAISE NOTICE '  [SUBSEQUENT] Setting: Start=% (next day) End=%', 
                    new_start_date, 
                    new_end_date;
                
                -- CRITICAL CHECK: Verify we're not on the same day
                IF prev_end_date::DATE >= new_start_date::DATE THEN
                    RAISE EXCEPTION 'ERROR: Session % starts on same or earlier date than previous ended! Prev end: %, New start: %', 
                        session_record.id, prev_end_date, new_start_date::DATE;
                END IF;
            END IF;
            
            -- Update the session
            UPDATE public.voting_sessions
            SET 
                start_date = new_start_date,
                end_date = new_end_date
            WHERE id = session_record.id;
            
            RAISE NOTICE '  ✓ Updated session %', session_record.id;
            
            -- Update previous end date for next iteration
            -- Extract just the DATE part (no time)
            prev_end_date := new_end_date::DATE;
            RAISE NOTICE '  Next session will start after: %', prev_end_date;
            RAISE NOTICE '';
        END LOOP;
    END LOOP;
    
    -- Handle sessions without a product_id (NULL product_id)
    IF EXISTS (SELECT 1 FROM public.voting_sessions WHERE product_id IS NULL) THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Processing sessions without product_id';
        RAISE NOTICE '========================================';
        
        prev_end_date := NULL;
        session_num := 0;
        
        FOR session_record IN 
            SELECT 
                id,
                title,
                start_date,
                end_date,
                product_id,
                (end_date::DATE - start_date::DATE)::INTEGER as duration
            FROM public.voting_sessions
            WHERE product_id IS NULL
            ORDER BY start_date ASC, id ASC
        LOOP
            session_num := session_num + 1;
            session_duration_days := session_record.duration;
            
            RAISE NOTICE '--- Session %: % (ID: %) ---', session_num, session_record.title, session_record.id;
            RAISE NOTICE '  Original: Start=% End=% Duration=% days', 
                session_record.start_date::DATE, 
                session_record.end_date::DATE,
                session_duration_days;
            
            IF prev_end_date IS NULL THEN
                new_start_date := DATE_TRUNC('day', session_record.start_date::DATE)::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23 hours 59 minutes 59 seconds'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  [FIRST] Setting: Start=% End=%', 
                    new_start_date, 
                    new_end_date;
            ELSE
                new_start_date := (prev_end_date + INTERVAL '1 day')::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23 hours 59 minutes 59 seconds'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  [SUBSEQUENT] Previous ended on: %', prev_end_date;
                RAISE NOTICE '  [SUBSEQUENT] Setting: Start=% (next day) End=%', 
                    new_start_date, 
                    new_end_date;
                
                -- CRITICAL CHECK
                IF prev_end_date::DATE >= new_start_date::DATE THEN
                    RAISE EXCEPTION 'ERROR: Session % starts on same or earlier date than previous ended! Prev end: %, New start: %', 
                        session_record.id, prev_end_date, new_start_date::DATE;
                END IF;
            END IF;
            
            UPDATE public.voting_sessions
            SET 
                start_date = new_start_date,
                end_date = new_end_date
            WHERE id = session_record.id;
            
            RAISE NOTICE '  ✓ Updated session %', session_record.id;
            prev_end_date := new_end_date::DATE;
            RAISE NOTICE '  Next session will start after: %', prev_end_date;
            RAISE NOTICE '';
        END LOOP;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Session date fix completed successfully!';
    RAISE NOTICE '========================================';
END $$;

-- Show results AFTER fix
SELECT 
    'AFTER FIX' as status,
    product_id,
    id,
    title,
    start_date,
    end_date,
    start_date::DATE as start_date_only,
    end_date::DATE as end_date_only,
    (end_date::DATE - start_date::DATE)::INTEGER as duration_days
FROM public.voting_sessions
ORDER BY 
    COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID),
    start_date ASC;

-- CRITICAL VERIFICATION: Find any sessions that still share dates
SELECT 
    '❌ ISSUES FOUND' as status,
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
        WHEN vs1.end_date::DATE = vs2.start_date::DATE THEN '❌ SAME DATE - Session 2 starts on same day Session 1 ends!'
        WHEN vs1.end_date::DATE > vs2.start_date::DATE THEN '❌ OVERLAP - Session 2 starts before Session 1 ends!'
        WHEN vs1.end_date::DATE + 1 != vs2.start_date::DATE THEN '⚠️ GAP - Session 2 does not start the day after Session 1 ends'
        ELSE '✓ OK'
    END as issue_type
FROM public.voting_sessions vs1
INNER JOIN public.voting_sessions vs2 
    ON (vs1.product_id = vs2.product_id OR (vs1.product_id IS NULL AND vs2.product_id IS NULL))
    AND vs1.id < vs2.id
WHERE 
    -- Find any issues: same date, overlap, or not day-after
    (vs1.end_date::DATE >= vs2.start_date::DATE OR vs1.end_date::DATE + 1 != vs2.start_date::DATE)
ORDER BY vs1.product_id, vs1.start_date;

