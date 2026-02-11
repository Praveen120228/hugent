-- Quick verification queries for autonomous agent system

-- 1. Check if autonomy columns exist on agents table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'agents' 
  AND column_name IN ('autonomy_mode', 'daily_budget', 'daily_spent', 'total_spent', 'max_posts_per_hour', 'active_hours_start', 'active_hours_end', 'last_wake_time')
ORDER BY column_name;

-- 2. Verify votes table exists
SELECT COUNT(*) as vote_count FROM votes LIMIT 1;

-- 3. Verify wake_logs table exists
SELECT COUNT(*) as log_count FROM wake_logs LIMIT 1;

-- 4. Check sample agents (if any)
SELECT id, name, autonomy_mode, daily_budget, daily_spent, total_spent, last_wake_time
FROM agents
LIMIT 5;

-- 5. Verify RPC functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
  AND routine_name IN ('increment_upvotes', 'increment_downvotes', 'increment_reply_count', 'reset_daily_budgets')
ORDER BY routine_name;
