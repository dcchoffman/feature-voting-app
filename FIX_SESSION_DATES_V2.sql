-- ============================================
-- Fix Session Dates V2 - More Robust
-- ============================================
-- This script ensures that:
-- 1. Sessions never end and start on the same day
-- 2. Each session starts the day after the previous session ends
-- 3. Start dates are at midnight (00:00:00)
-- 4. End dates are at 11:59:59 PM (23:59:59)
-- ============================================

-- First, show what we're fixing
SELECT 
    'BEFORE FIX' as status,
    product_id,
    id,
    title,
    start_date::DATE as start_date,
    end_date::DATE as end_date,
    (end_date::DATE - start_date::DATE)::INTEGER as duration_days
FROM public.voting_sessions
ORDER BY 
    COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID),
    start_date ASC;

DO $$
DECLARE
    session_record RECORD;
    prev_end_date DATE;
    new_start_date TIMESTAMP;
    new_end_date TIMESTAMP;
    session_duration_days INTEGER;
    product_id_val UUID;
    session_count INTEGER;
BEGIN
    -- Loop through each product
    FOR product_id_val IN 
        SELECT DISTINCT product_id 
        FROM public.voting_sessions 
        WHERE product_id IS NOT NULL
        ORDER BY product_id
    LOOP
        -- Get count of sessions for this product
        SELECT COUNT(*) INTO session_count
        FROM public.voting_sessions
        WHERE product_id = product_id_val;
        
        RAISE NOTICE 'Processing product: % (% sessions)', product_id_val, session_count;
        
        -- Reset previous end date for each product
        prev_end_date := NULL;
    
        -- Process sessions for this product
        -- Order by the EARLIEST of start_date or end_date to handle any ordering issues
        -- Use id as tiebreaker for consistent ordering
        FOR session_record IN 
            SELECT 
                id,
                start_date,
                end_date,
                product_id,
                (end_date::DATE - start_date::DATE)::INTEGER as duration
            FROM public.voting_sessions
            WHERE product_id = product_id_val
            ORDER BY 
                LEAST(start_date::DATE, end_date::DATE) ASC,
                id ASC
        LOOP
            -- Use the calculated duration from the query
            session_duration_days := session_record.duration;
            
            -- If this is the first session for this product, keep its start date but ensure times are correct
            IF prev_end_date IS NULL THEN
                -- First session: keep start date, ensure times are correct
                new_start_date := DATE_TRUNC('day', session_record.start_date::DATE)::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  [%] First session %: Start: % (was: %), End: % (was: %) - Duration: % days', 
                    product_id_val,
                    session_record.id, 
                    new_start_date::DATE,
                    session_record.start_date::DATE,
                    new_end_date::DATE,
                    session_record.end_date::DATE,
                    session_duration_days;
            ELSE
                -- Subsequent sessions: start the day AFTER previous session ends
                -- CRITICAL: prev_end_date is the DATE (not timestamp), so adding 1 day gives us the next day
                new_start_date := (prev_end_date + INTERVAL '1 day')::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  [%] Session %: Previous ended: %, New start: % (was: %), New end: % (was: %) - Duration: % days', 
                    product_id_val,
                    session_record.id, 
                    prev_end_date,
                    new_start_date::DATE,
                    session_record.start_date::DATE,
                    new_end_date::DATE,
                    session_record.end_date::DATE,
                    session_duration_days;
            END IF;
            
            -- Update the session with corrected dates
            UPDATE public.voting_sessions
            SET 
                start_date = new_start_date,
                end_date = new_end_date
            WHERE id = session_record.id;
            
            -- Update previous end date for next iteration (use DATE, not TIMESTAMP)
            prev_end_date := new_end_date::DATE;
        END LOOP;
    END LOOP;
    
    -- Handle sessions without a product_id (NULL product_id)
    IF EXISTS (SELECT 1 FROM public.voting_sessions WHERE product_id IS NULL) THEN
        SELECT COUNT(*) INTO session_count
        FROM public.voting_sessions
        WHERE product_id IS NULL;
        
        RAISE NOTICE 'Processing sessions without product_id (% sessions)', session_count;
        prev_end_date := NULL;
        
        FOR session_record IN 
            SELECT 
                id,
                start_date,
                end_date,
                product_id,
                (end_date::DATE - start_date::DATE)::INTEGER as duration
            FROM public.voting_sessions
            WHERE product_id IS NULL
            ORDER BY 
                LEAST(start_date::DATE, end_date::DATE) ASC,
                id ASC
        LOOP
            -- Use the calculated duration from the query
            session_duration_days := session_record.duration;
            
            -- If this is the first session without product, keep its start date but ensure times are correct
            IF prev_end_date IS NULL THEN
                -- First session: keep start date, ensure times are correct
                new_start_date := DATE_TRUNC('day', session_record.start_date::DATE)::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  [NULL] First session %: Start: % (was: %), End: % (was: %) - Duration: % days', 
                    session_record.id, 
                    new_start_date::DATE,
                    session_record.start_date::DATE,
                    new_end_date::DATE,
                    session_record.end_date::DATE,
                    session_duration_days;
            ELSE
                -- Subsequent sessions: start the day after previous session ends
                new_start_date := (prev_end_date + INTERVAL '1 day')::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  [NULL] Session %: Previous ended: %, New start: % (was: %), New end: % (was: %) - Duration: % days', 
                    session_record.id, 
                    prev_end_date,
                    new_start_date::DATE,
                    session_record.start_date::DATE,
                    new_end_date::DATE,
                    session_record.end_date::DATE,
                    session_duration_days;
            END IF;
            
            -- Update the session with corrected dates
            UPDATE public.voting_sessions
            SET 
                start_date = new_start_date,
                end_date = new_end_date
            WHERE id = session_record.id;
            
            -- Update previous end date for next iteration
            prev_end_date := new_end_date::DATE;
        END LOOP;
    END IF;
    
    RAISE NOTICE 'Session date fix completed successfully!';
END $$;

-- Show results AFTER fix
SELECT 
    'AFTER FIX' as status,
    product_id,
    id,
    title,
    start_date::DATE as start_date,
    end_date::DATE as end_date,
    (end_date::DATE - start_date::DATE)::INTEGER as duration_days
FROM public.voting_sessions
ORDER BY 
    COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID),
    start_date ASC;

-- Verify: Find any sessions that still have same-day start/end issues
SELECT 
    'ISSUES FOUND' as status,
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
        WHEN vs1.end_date::DATE >= vs2.start_date::DATE THEN 'OVERLAP - Session 2 starts on or before Session 1 ends'
        WHEN vs1.end_date::DATE + 1 != vs2.start_date::DATE THEN 'GAP - Session 2 does not start the day after Session 1 ends'
        ELSE 'OK'
    END as issue_type
FROM public.voting_sessions vs1
INNER JOIN public.voting_sessions vs2 
    ON (vs1.product_id = vs2.product_id OR (vs1.product_id IS NULL AND vs2.product_id IS NULL))
    AND vs1.id < vs2.id
WHERE 
    -- Check if sessions overlap or don't start the day after previous ends
    (vs1.end_date::DATE >= vs2.start_date::DATE OR vs1.end_date::DATE + 1 != vs2.start_date::DATE)
ORDER BY vs1.product_id, vs1.start_date;

