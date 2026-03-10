-- ==========================================
-- AUTH SERVICE — Migration 0003
-- Cleanup Shadowing Tables & Diagnostics
-- ==========================================

-- 1. Remove ANY table in the 'auth' schema called 'users' 
-- (They shouldn't exist, as we use public.users)
DROP TABLE IF EXISTS auth.users CASCADE;

-- 2. Verify public.users exists and has data
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        RAISE NOTICE 'Diagnostic: public.users exists.';
    ELSE
        RAISE EXCEPTION 'Diagnostic: public.users MISSING!';
    END IF;
END $$;
