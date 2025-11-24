-- ============================================
-- Fix Session Dates
-- ============================================
-- This script ensures that:
-- 1. Sessions never end and start on the same day
-- 2. Each session starts the day after the previous session ends
-- 3. Start dates are at midnight (00:00:00)
-- 4. End dates are at 11:59:59 PM (23:59:59)
-- ============================================

DO $$
DECLARE
    session_record RECORD;
    prev_end_date DATE;
    new_start_date TIMESTAMP;
    new_end_date TIMESTAMP;
    session_duration_days INTEGER;
    product_id_val UUID;
BEGIN
    -- Loop through each product
    FOR product_id_val IN 
        SELECT DISTINCT product_id 
        FROM public.voting_sessions 
        WHERE product_id IS NOT NULL
        ORDER BY product_id
    LOOP
        RAISE NOTICE 'Processing product: %', product_id_val;
        
        -- Reset previous end date for each product
        prev_end_date := NULL;
    
        -- Process sessions for this product, ordered by start_date
        FOR session_record IN 
            SELECT 
                id,
                start_date,
                end_date,
                product_id
            FROM public.voting_sessions
            WHERE product_id = product_id_val
            ORDER BY start_date ASC
        LOOP
            -- Calculate session duration (preserve the original duration)
            -- DATE subtraction returns INTEGER (number of days)
            session_duration_days := (session_record.end_date::DATE - session_record.start_date::DATE)::INTEGER;
            
            -- If this is the first session for this product, keep its start date but ensure times are correct
            IF prev_end_date IS NULL THEN
                -- First session: keep start date, ensure times are correct
                new_start_date := DATE_TRUNC('day', session_record.start_date::DATE)::TIMESTAMP;
                new_end_date := (DATE_TRUNC('day', session_record.start_date::DATE) + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  First session %: Start: %, End: % (duration: % days)', 
                    session_record.id, 
                    new_start_date, 
                    new_end_date,
                    session_duration_days;
            ELSE
                -- Subsequent sessions: start the day after previous session ends
                new_start_date := (prev_end_date + INTERVAL '1 day')::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE '  Session %: Previous end: %, New start: %, New end: % (duration: % days)', 
                    session_record.id, 
                    prev_end_date, 
                    new_start_date, 
                    new_end_date,
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
    END LOOP;
    
    -- Handle sessions without a product_id (NULL product_id)
    -- Only process if there are any sessions without product_id
    IF EXISTS (SELECT 1 FROM public.voting_sessions WHERE product_id IS NULL) THEN
        RAISE NOTICE 'Processing sessions without product_id';
        prev_end_date := NULL;
        
        FOR session_record IN 
            SELECT 
                id,
                start_date,
                end_date,
                product_id
            FROM public.voting_sessions
            WHERE product_id IS NULL
            ORDER BY start_date ASC
        LOOP
        -- Calculate session duration (preserve the original duration)
        -- DATE subtraction returns INTEGER (number of days)
        session_duration_days := (session_record.end_date::DATE - session_record.start_date::DATE)::INTEGER;
        
        -- If this is the first session without product, keep its start date but ensure times are correct
        IF prev_end_date IS NULL THEN
            -- First session: keep start date, ensure times are correct
            new_start_date := DATE_TRUNC('day', session_record.start_date::DATE)::TIMESTAMP;
            new_end_date := (DATE_TRUNC('day', session_record.start_date::DATE) + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
            
            RAISE NOTICE '  First session (no product) %: Start: %, End: % (duration: % days)', 
                session_record.id, 
                new_start_date, 
                new_end_date,
                session_duration_days;
        ELSE
            -- Subsequent sessions: start the day after previous session ends
            new_start_date := (prev_end_date + INTERVAL '1 day')::TIMESTAMP;
            new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
            
            RAISE NOTICE '  Session (no product) %: Previous end: %, New start: %, New end: % (duration: % days)', 
                session_record.id, 
                prev_end_date, 
                new_start_date, 
                new_end_date,
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

-- Summary: Show all sessions with their corrected dates, grouped by product
SELECT 
    product_id,
    id,
    title,
    start_date,
    end_date,
    (end_date::DATE - start_date::DATE)::INTEGER as duration_days,
    CASE 
        WHEN start_date::DATE = CURRENT_DATE THEN 'TODAY'
        WHEN start_date::DATE < CURRENT_DATE AND end_date::DATE >= CURRENT_DATE THEN 'ACTIVE'
        WHEN start_date::DATE > CURRENT_DATE THEN 'UPCOMING'
        ELSE 'CLOSED'
    END as status
FROM public.voting_sessions
ORDER BY 
    COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID),
    start_date ASC;

-- Verify the fix: Show sessions that still have issues (should be none)
-- This checks for:
-- 1. Sessions that overlap
-- 2. Sessions that start on the same day as previous session ends (should start next day)
SELECT 
    vs1.id as session1_id,
    vs1.title as session1_title,
    vs1.start_date as session1_start,
    vs1.end_date as session1_end,
    vs2.id as session2_id,
    vs2.title as session2_title,
    vs2.start_date as session2_start,
    vs2.end_date as session2_end,
    vs1.product_id,
    CASE 
        WHEN vs1.end_date::DATE >= vs2.start_date::DATE THEN 'OVERLAP'
        WHEN vs1.end_date::DATE + 1 != vs2.start_date::DATE THEN 'NOT_DAY_AFTER'
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

