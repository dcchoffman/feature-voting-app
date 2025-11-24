-- ============================================
-- Fix Session Dates - FINAL WORKING VERSION
-- ============================================
-- This version processes sessions in a guaranteed correct order
-- ============================================

-- Step 1: Show current state
SELECT 
    'BEFORE' as status,
    product_id,
    id,
    title,
    start_date::DATE as start,
    end_date::DATE as end
FROM public.voting_sessions
ORDER BY COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID), start_date;

-- Step 2: Fix using a cursor-based approach with explicit ordering
DO $$
DECLARE
    cur CURSOR FOR 
        SELECT 
            id,
            product_id,
            title,
            start_date,
            end_date,
            (end_date::DATE - start_date::DATE)::INTEGER as duration
        FROM public.voting_sessions
        ORDER BY 
            COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID),
            LEAST(start_date::DATE, end_date::DATE) ASC,
            id ASC;
    
    session_rec RECORD;
    prev_product_id UUID;
    prev_end_date DATE;
    new_start TIMESTAMP;
    new_end TIMESTAMP;
    dur INTEGER;
BEGIN
    prev_product_id := NULL;
    prev_end_date := NULL;
    
    OPEN cur;
    LOOP
        FETCH cur INTO session_rec;
        EXIT WHEN NOT FOUND;
        
        -- Check if we're starting a new product group
        IF prev_product_id IS NULL OR 
           COALESCE(prev_product_id, '00000000-0000-0000-0000-000000000000'::UUID) != 
           COALESCE(session_rec.product_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN
            -- New product group - reset
            prev_end_date := NULL;
            prev_product_id := COALESCE(session_rec.product_id, '00000000-0000-0000-0000-000000000000'::UUID);
            RAISE NOTICE 'Starting new product group: %', prev_product_id;
        END IF;
        
        dur := session_rec.duration;
        IF dur < 0 THEN dur := 0; END IF;
        
        IF prev_end_date IS NULL THEN
            -- First session in group
            new_start := DATE_TRUNC('day', session_rec.start_date::DATE)::TIMESTAMP;
            new_end := (new_start::DATE + (dur || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
            
            RAISE NOTICE '[FIRST] %: % -> %', session_rec.title, new_start::DATE, new_end::DATE;
        ELSE
            -- Subsequent session: MUST start day AFTER previous ends
            new_start := (prev_end_date + INTERVAL '1 day')::TIMESTAMP;
            new_end := (new_start::DATE + (dur || ' days')::INTERVAL + '23:59:59'::INTERVAL)::TIMESTAMP;
            
            RAISE NOTICE '[NEXT] %: Previous ended %, New start % -> %', 
                session_rec.title, prev_end_date, new_start::DATE, new_end::DATE;
            
            -- CRITICAL CHECK
            IF prev_end_date >= new_start::DATE THEN
                RAISE EXCEPTION 'FATAL: Session % starts % which is same/before previous end %', 
                    session_rec.id, new_start::DATE, prev_end_date;
            END IF;
        END IF;
        
        -- Update
        UPDATE public.voting_sessions
        SET start_date = new_start, end_date = new_end
        WHERE id = session_rec.id;
        
        prev_end_date := new_end::DATE;
    END LOOP;
    CLOSE cur;
    
    RAISE NOTICE 'Fix completed successfully!';
END $$;

-- Step 3: Verify - should return NO ROWS
SELECT 
    'VERIFICATION' as status,
    vs1.product_id,
    vs1.title as s1,
    vs1.end_date::DATE as s1_ends,
    vs2.title as s2,
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

-- Step 4: Show final state
SELECT 
    'AFTER' as status,
    product_id,
    id,
    title,
    start_date::DATE as start,
    end_date::DATE as end,
    start_date::TIME as start_time,
    end_date::TIME as end_time
FROM public.voting_sessions
ORDER BY COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID), start_date;

