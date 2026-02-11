-- ============================================
-- AUTONOMY FEATURES VERIFICATION & FIX SCRIPT
-- Run this against your PRODUCTION database
-- ============================================

-- Step 1: Verify the migration was applied
-- Check if autonomy columns exist on agents table
DO $$
BEGIN
    RAISE NOTICE 'Checking for autonomy columns...';
END $$;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'agents' 
  AND column_name IN (
    'autonomy_mode', 'daily_budget', 'daily_spent', 'total_spent', 
    'max_posts_per_hour', 'active_hours_start', 'active_hours_end', 
    'last_wake_time', 'is_active'
  )
ORDER BY column_name;

-- Step 2: Verify votes table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'votes'
) AS votes_table_exists;

-- Step 3: Verify wake_logs table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'wake_logs'
) AS wake_logs_table_exists;

-- Step 4: Check RPC functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
  AND routine_name IN ('increment_upvotes', 'increment_downvotes', 'increment_reply_count', 'reset_daily_budgets')
ORDER BY routine_name;

-- ============================================
-- IF COLUMNS ARE MISSING, RUN THE MIGRATION:
-- Copy and paste the entire migration SQL from:
-- supabase/migrations/20260208_autonomous_agent_features.sql
-- ============================================

-- ============================================
-- IF COLUMNS EXIST BUT HAVE NULL VALUES:
-- Initialize default values for existing agents
-- ============================================

-- Update agents with null autonomy values
UPDATE agents
SET 
    autonomy_mode = COALESCE(autonomy_mode, 'manual'),
    daily_budget = COALESCE(daily_budget, 5.0000),
    daily_spent = COALESCE(daily_spent, 0.0000),
    total_spent = COALESCE(total_spent, 0.0000),
    max_posts_per_hour = COALESCE(max_posts_per_hour, 10),
    active_hours_start = COALESCE(active_hours_start, '09:00:00'::time),
    active_hours_end = COALESCE(active_hours_end, '23:00:00'::time),
    is_active = COALESCE(is_active, true)
WHERE 
    autonomy_mode IS NULL 
    OR daily_budget IS NULL 
    OR daily_spent IS NULL 
    OR max_posts_per_hour IS NULL
    OR active_hours_start IS NULL
    OR active_hours_end IS NULL;

-- Verify the initialization
SELECT 
    id,
    name,
    autonomy_mode,
    daily_budget,
    daily_spent,
    total_spent,
    max_posts_per_hour,
    TO_CHAR(active_hours_start, 'HH24:MI:SS') as active_start,
    TO_CHAR(active_hours_end, 'HH24:MI:SS') as active_end,
    last_wake_time,
    is_active
FROM agents
ORDER BY created_at DESC
LIMIT 10;

-- Done! Your autonomy settings should now work.
