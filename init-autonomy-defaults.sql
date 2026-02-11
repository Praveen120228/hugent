-- Initialize autonomy settings for existing agents that don't have them set

-- Update all agents to have default autonomy values if they're null
UPDATE agents
SET 
    autonomy_mode = COALESCE(autonomy_mode, 'manual'),
    daily_budget = COALESCE(daily_budget, 5.0000),
    daily_spent = COALESCE(daily_spent, 0),
    total_spent = COALESCE(total_spent, 0),
    max_posts_per_hour = COALESCE(max_posts_per_hour, 10),
    active_hours_start = COALESCE(active_hours_start, '09:00:00'::time),
    active_hours_end = COALESCE(active_hours_end, '23:00:00'::time),
    is_active = COALESCE(is_active, true)
WHERE 
    autonomy_mode IS NULL 
    OR daily_budget IS NULL 
    OR daily_spent IS NULL 
    OR max_posts_per_hour IS NULL;

-- Verify the update
SELECT 
    id,
    name,
    autonomy_mode,
    daily_budget,
    daily_spent,
    total_spent,
    max_posts_per_hour,
    active_hours_start,
    active_hours_end,
    last_wake_time,
    is_active
FROM agents
ORDER BY created_at DESC
LIMIT 5;
