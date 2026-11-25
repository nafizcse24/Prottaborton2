-- ==============================================================================
-- PROTTABORTON 2.0 (প্রত্যাবর্তন ২.০)
-- SUPABASE POSTGRESQL SCHEMA & VISITOR TRACKING ENGINE
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your Project -> SQL Editor
-- 3. Paste this entire script and click "Run"
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES
-- Table: visitors (Tracks persistent anonymous visitor identities)
CREATE TABLE IF NOT EXISTS public.visitors (
    visitor_id TEXT PRIMARY KEY,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    total_sessions INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table: visits (Tracks discrete deduplicated visits per session)
CREATE TABLE IF NOT EXISTS public.visits (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    visitor_id TEXT NOT NULL REFERENCES public.visitors(visitor_id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    device_category TEXT DEFAULT 'desktop',
    visited_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT visits_visitor_session_key UNIQUE (visitor_id, session_id)
);

-- 3. PERFORMANCE INDEXES
-- Index on visited_at timestamp for fast range filtering & ordering
CREATE INDEX IF NOT EXISTS idx_visits_visited_at 
    ON public.visits (visited_at DESC);

-- Index on visitor_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id 
    ON public.visits (visitor_id);

-- Expression index for Bangladesh Calendar Day (UTC+6 / Asia/Dhaka)
CREATE INDEX IF NOT EXISTS idx_visits_dhaka_date 
    ON public.visits (((visited_at AT TIME ZONE 'Asia/Dhaka')::date));

-- Index on visitors last seen
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen 
    ON public.visitors (last_seen_at DESC);


-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Lock down tables so raw visitor data cannot be queried or tampered with by the public
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Explicitly revoke direct table permissions from anon and authenticated roles.
-- Access is strictly managed through the secure SECURITY DEFINER RPC functions below.
REVOKE ALL ON public.visitors FROM anon, authenticated;
REVOKE ALL ON public.visits FROM anon, authenticated;


-- 5. RPC FUNCTION: GET AGGREGATED VISITOR STATS (Safe read-only endpoint)
-- Returns aggregated metrics only: Total Visits, Unique Visitors, and Today's Visits (Asia/Dhaka)
CREATE OR REPLACE FUNCTION public.get_visitor_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_visits BIGINT;
    v_unique_visitors BIGINT;
    v_today_visits BIGINT;
    v_today_date DATE;
    v_result JSONB;
BEGIN
    -- Determine current Bangladesh date (Asia/Dhaka UTC+6)
    v_today_date := (timezone('Asia/Dhaka', now()))::date;

    -- Count total unique visitors
    SELECT COUNT(*) INTO v_unique_visitors 
    FROM public.visitors;

    -- Count total visits (all recorded valid sessions)
    SELECT COUNT(*) INTO v_total_visits 
    FROM public.visits;

    -- Count visits for today in Bangladesh Timezone (Asia/Dhaka)
    SELECT COUNT(*) INTO v_today_visits 
    FROM public.visits 
    WHERE (visited_at AT TIME ZONE 'Asia/Dhaka')::date = v_today_date;

    -- Build clean JSON response
    v_result := jsonb_build_object(
        'total_visits', COALESCE(v_total_visits, 0),
        'unique_visitors', COALESCE(v_unique_visitors, 0),
        'today_visits', COALESCE(v_today_visits, 0),
        'timezone', 'Asia/Dhaka (UTC+6)',
        'date_bst', v_today_date,
        'server_time', timezone('Asia/Dhaka', now())
    );

    RETURN v_result;
END;
$$;

-- Grant EXECUTE permission to anon and authenticated roles for get_visitor_stats
GRANT EXECUTE ON FUNCTION public.get_visitor_stats() TO anon, authenticated;


-- 6. RPC FUNCTION: RECORD VISIT (Secure visit ingestion & deduplication)
-- Records or deduplicates an incoming visit and returns updated stats atomically
CREATE OR REPLACE FUNCTION public.record_visit(
    p_visitor_id TEXT,
    p_session_id TEXT,
    p_device_type TEXT DEFAULT 'desktop'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_new_session BOOLEAN := false;
BEGIN
    -- 1. Input Validation: Discard invalid or excessively long IDs
    IF p_visitor_id IS NULL OR length(trim(p_visitor_id)) < 8 OR length(p_visitor_id) > 128 THEN
        RAISE EXCEPTION 'Invalid visitor_id provided';
    END IF;

    IF p_session_id IS NULL OR length(trim(p_session_id)) < 8 OR length(p_session_id) > 128 THEN
        RAISE EXCEPTION 'Invalid session_id provided';
    END IF;

    -- 2. Upsert Visitor Identity (registers new visitor or refreshes last_seen_at)
    INSERT INTO public.visitors (visitor_id, first_seen_at, last_seen_at, total_sessions)
    VALUES (p_visitor_id, now(), now(), 1)
    ON CONFLICT (visitor_id) DO UPDATE
    SET last_seen_at = now();

    -- 3. Record Session Visit (Deduplicated per session_id)
    -- If visitor refreshes the page in the same session, ON CONFLICT prevents duplicate counts
    INSERT INTO public.visits (visitor_id, session_id, device_category, visited_at)
    VALUES (
        p_visitor_id, 
        p_session_id, 
        COALESCE(SUBSTRING(p_device_type, 1, 32), 'desktop'), 
        now()
    )
    ON CONFLICT (visitor_id, session_id) DO NOTHING;

    -- Check if this was a new insertion
    IF FOUND THEN
        v_is_new_session := true;
        
        -- Increment session counter for existing returning visitors
        UPDATE public.visitors
        SET total_sessions = total_sessions + 1
        WHERE visitor_id = p_visitor_id
          AND first_seen_at < (now() - INTERVAL '1 second');
    END IF;

    -- 4. Return the latest aggregated statistics immediately
    RETURN public.get_visitor_stats();
END;
$$;

-- Grant EXECUTE permission to anon and authenticated roles for record_visit
GRANT EXECUTE ON FUNCTION public.record_visit(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ==============================================================================
-- SCHEMA & RPC SETUP COMPLETE
-- ==============================================================================
