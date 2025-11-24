-- ============================================
-- Fix Session Dates - Definitive Version
-- ============================================
-- This script uses a CTE with ROW_NUMBER to ensure proper ordering
-- and processes sessions in the correct sequence
-- ============================================

-- Step 1: Show what we're fixing
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

-- Step 2: Fix all sessions using a more reliable approach
DO $$
DECLARE
    session_row RECORD;
    prev_end_date DATE;
    new_start_date TIMESTAMP;
    new_end_date TIMESTAMP;
    session_duration_days INTEGER;
    product_id_val UUID;
BEGIN
    -- Process each product separately
    FOR product_id_val IN 
        SELECT DISTINCT product_id 
        FROM public.voting_sessions 
        WHERE product_id IS NOT NULL
        ORDER BY product_id
    LOOP
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Processing product: %', product_id_val;
        RAISE NOTICE '========================================';
        
        prev_end_date := NULL;
        
        -- Use a CTE to get sessions ordered by the EARLIEST date (start or end)
        -- This ensures we process them in chronological order regardless of current state
        FOR session_row IN 
            WITH ordered_sessions AS (
                SELECT 
                    id,
                    title,
                    start_date,
                    end_date,
                    (end_date::DATE - start_date::DATE)::INTEGER as duration,
                    ROW_NUMBER() OVER (ORDER BY LEAST(start_date::DATE, end_date::DATE) ASC, id ASC) as rn
                FROM public.voting_sessions
                WHERE product_id = product_id_val
            )
            SELECT 
                id,
                title,
                start_date,
                end_date,
                duration
            FROM ordered_sessions
            ORDER BY rn
        LOOP
            session_duration_days := session_row.duration;
            
            IF prev_end_date IS NULL THEN
                -- First session: normalize times but keep the date
                new_start_date := DATE_TRUNC('day', session_row.start_date::DATE)::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE 'Session 1: % - Start: % (was: %), End: % (was: %)', 
                    session_row.title,
                    new_start_date::DATE,
                    session_row.start_date::DATE,
                    new_end_date::DATE,
                    session_row.end_date::DATE;
            ELSE
                -- CRITICAL: Next session starts the day AFTER previous ends
                -- If prev_end_date is Nov 24, next starts Nov 25
                new_start_date := (prev_end_date + INTERVAL '1 day')::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
                
                RAISE NOTICE 'Session: % - Previous ended: %, New start: % (was: %), New end: % (was: %)', 
                    session_row.title,
                    prev_end_date,
                    new_start_date::DATE,
                    session_row.start_date::DATE,
                    new_end_date::DATE,
                    session_row.end_date::DATE;
                
                -- Safety check: this should NEVER happen
                IF prev_end_date >= new_start_date::DATE THEN
                    RAISE EXCEPTION 'FATAL ERROR: Session % would start on % which is same or before previous end date %', 
                        session_row.id, new_start_date::DATE, prev_end_date;
                END IF;
            END IF;
            
            -- Update the session
            UPDATE public.voting_sessions
            SET 
                start_date = new_start_date,
                end_date = new_end_date
            WHERE id = session_row.id;
            
            -- Update for next iteration
            prev_end_date := new_end_date::DATE;
        END LOOP;
    END LOOP;
    
    -- Handle NULL product_id sessions
    IF EXISTS (SELECT 1 FROM public.voting_sessions WHERE product_id IS NULL) THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Processing sessions without product_id';
        RAISE NOTICE '========================================';
        
        prev_end_date := NULL;
        
        FOR session_row IN 
            WITH ordered_sessions AS (
                SELECT 
                    id,
                    title,
                    start_date,
                    end_date,
                    (end_date::DATE - start_date::DATE)::INTEGER as duration,
                    ROW_NUMBER() OVER (ORDER BY LEAST(start_date::DATE, end_date::DATE) ASC, id ASC) as rn
                FROM public.voting_sessions
                WHERE product_id IS NULL
            )
            SELECT 
                id,
                title,
                start_date,
                end_date,
                duration
            FROM ordered_sessions
            ORDER BY rn
        LOOP
            session_duration_days := session_row.duration;
            
            IF prev_end_date IS NULL THEN
                new_start_date := DATE_TRUNC('day', session_row.start_date::DATE)::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
            ELSE
                new_start_date := (prev_end_date + INTERVAL '1 day')::TIMESTAMP;
                new_end_date := (new_start_date::DATE + (session_duration_days || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
                
                IF prev_end_date >= new_start_date::DATE THEN
                    RAISE EXCEPTION 'FATAL ERROR: Session % would start on % which is same or before previous end date %', 
                        session_row.id, new_start_date::DATE, prev_end_date;
                END IF;
            END IF;
            
            UPDATE public.voting_sessions
            SET 
                start_date = new_start_date,
                end_date = new_end_date
            WHERE id = session_row.id;
            
            prev_end_date := new_end_date::DATE;
        END LOOP;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fix completed successfully!';
    RAISE NOTICE '========================================';
END $$;

-- Step 3: Show results
SELECT 
    'AFTER FIX' as status,
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

-- Step 4: Find ANY remaining issues
SELECT 
    '❌ REMAINING ISSUES' as status,
    vs1.product_id,
    vs1.id as session1_id,
    vs1.title as session1_title,
    vs1.start_date::DATE as session1_start,
    vs1.end_date::DATE as session1_end,
    vs2.id as session2_id,
    vs2.title as session2_title,
    vs2.start_date::DATE as session2_start,
    vs2.end_date::DATE as session2_end,
    CASE 
        WHEN vs1.end_date::DATE = vs2.start_date::DATE THEN 
            '❌ SAME DATE - Session 2 starts on ' || vs2.start_date::DATE::TEXT || 
            ' which is the SAME DAY Session 1 ends on ' || vs1.end_date::DATE::TEXT
        WHEN vs1.end_date::DATE > vs2.start_date::DATE THEN 
            '❌ OVERLAP - Session 2 starts BEFORE Session 1 ends'
        WHEN vs1.end_date::DATE + 1 != vs2.start_date::DATE THEN 
            '⚠️ GAP - Session 2 starts ' || (vs2.start_date::DATE - vs1.end_date::DATE)::TEXT || 
            ' days after Session 1 ends (should be exactly 1 day)'
        ELSE '✓ OK'
    END as issue_description
FROM public.voting_sessions vs1
INNER JOIN public.voting_sessions vs2 
    ON (vs1.product_id = vs2.product_id OR (vs1.product_id IS NULL AND vs2.product_id IS NULL))
    AND vs1.id < vs2.id
WHERE 
    -- Find any problems
    (vs1.end_date::DATE >= vs2.start_date::DATE OR vs1.end_date::DATE + 1 != vs2.start_date::DATE)
ORDER BY vs1.product_id, vs1.start_date;

