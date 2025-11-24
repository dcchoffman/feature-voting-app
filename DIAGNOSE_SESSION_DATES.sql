-- ============================================
-- Diagnose Session Dates
-- ============================================
-- This query shows the EXACT state of dates in the database
-- including both DATE and TIMESTAMP values
-- ============================================

-- Show all sessions with full date/time information
SELECT 
    product_id,
    id,
    title,
    -- Full timestamp values
    start_date as start_timestamp,
    end_date as end_timestamp,
    -- Date-only values
    start_date::DATE as start_date_only,
    end_date::DATE as end_date_only,
    -- Time components
    start_date::TIME as start_time,
    end_date::TIME as end_time,
    -- Duration
    (end_date::DATE - start_date::DATE)::INTEGER as duration_days,
    -- Check if times are correct
    CASE 
        WHEN start_date::TIME = '00:00:00'::TIME THEN '✓ Start at midnight'
        ELSE '✗ Start NOT at midnight: ' || start_date::TIME::TEXT
    END as start_time_check,
    CASE 
        WHEN end_date::TIME = '23:59:59'::TIME THEN '✓ End at 11:59:59 PM'
        ELSE '✗ End NOT at 11:59:59 PM: ' || end_date::TIME::TEXT
    END as end_time_check
FROM public.voting_sessions
ORDER BY 
    COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID),
    start_date ASC;

-- Find sessions that share dates (same product, consecutive sessions)
SELECT 
    'SAME DATE ISSUES' as status,
    vs1.product_id,
    vs1.id as session1_id,
    vs1.title as session1_title,
    vs1.start_date::DATE as session1_start,
    vs1.end_date::DATE as session1_end,
    vs1.end_date::TIME as session1_end_time,
    vs2.id as session2_id,
    vs2.title as session2_title,
    vs2.start_date::DATE as session2_start,
    vs2.start_date::TIME as session2_start_time,
    vs2.end_date::DATE as session2_end,
    CASE 
        WHEN vs1.end_date::DATE = vs2.start_date::DATE THEN 
            '❌ SAME DATE - Session 2 starts on ' || vs2.start_date::DATE::TEXT || 
            ' which is the same day Session 1 ends on ' || vs1.end_date::DATE::TEXT
        WHEN vs1.end_date::DATE > vs2.start_date::DATE THEN 
            '❌ OVERLAP - Session 2 starts before Session 1 ends'
        WHEN vs1.end_date::DATE + 1 != vs2.start_date::DATE THEN 
            '⚠️ GAP - Session 2 starts ' || (vs2.start_date::DATE - vs1.end_date::DATE)::TEXT || 
            ' days after Session 1 ends (should be 1 day)'
        ELSE '✓ OK'
    END as issue_description
FROM public.voting_sessions vs1
INNER JOIN public.voting_sessions vs2 
    ON (vs1.product_id = vs2.product_id OR (vs1.product_id IS NULL AND vs2.product_id IS NULL))
    AND vs1.id < vs2.id
WHERE 
    -- Find any issues
    (vs1.end_date::DATE >= vs2.start_date::DATE OR vs1.end_date::DATE + 1 != vs2.start_date::DATE)
ORDER BY vs1.product_id, vs1.start_date;

