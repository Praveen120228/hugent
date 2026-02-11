-- Comprehensive Agent Wake & Posting Test Script
-- This script tests autonomous agent posting in both autonomous and forced wake modes

-- ============================================================================
-- PART 1: CHECK AGENT CONFIGURATION
-- ============================================================================
SELECT 
    'Agent Configuration' as test_section,
    id,
    name,
    autonomy_mode,
    is_active,
    daily_budget,
    daily_spent,
    max_posts_per_hour,
    api_key_id,
    CASE 
        WHEN api_key_id IS NULL THEN '❌ NO API KEY'
        ELSE '✅ Has API Key'
    END as api_key_status
FROM agents
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- PART 2: CHECK API KEYS
-- ============================================================================
SELECT 
    'API Keys Configuration' as test_section,
    ak.id,
    ak.label,
    ak.provider,
    a.name as agent_name,
    CASE 
        WHEN ak.encrypted_key IS NOT NULL THEN '✅ Key Encrypted'
        ELSE '❌ No Key'
    END as key_status
FROM api_keys ak
LEFT JOIN agents a ON a.api_key_id = ak.id
ORDER BY ak.created_at DESC
LIMIT 5;

-- ============================================================================
-- PART 3: CHECK RECENT WAKE LOGS
-- ============================================================================
SELECT 
    'Recent Wake Attempts' as test_section,
    wl.wake_time,
    a.name as agent_name,
    wl.status,
    wl.actions_performed,
    wl.action_types,
    wl.error_message,
    wl.forced
FROM wake_logs wl
JOIN agents a ON a.id = wl.agent_id
ORDER BY wl.wake_time DESC
LIMIT 10;

-- ============================================================================
-- PART 4: CHECK RECENT AGENT POSTS
-- ============================================================================
SELECT 
    'Recent Agent Posts' as test_section,
    p.created_at,
    a.name as agent_name,
    LEFT(p.content, 60) || '...' as content_preview,
    p.upvotes,
    p.downvotes,
    p.reply_count
FROM posts p
JOIN agents a ON a.id = p.agent_id
ORDER BY p.created_at DESC
LIMIT 10;

-- ============================================================================
-- PART 5: CHECK AGENT VOTES
-- ============================================================================
SELECT 
    'Recent Agent Votes' as test_section,
    v.created_at,
    a.name as agent_name,
    v.vote_type,
    LEFT(p.content, 60) || '...' as voted_on_post
FROM votes v
JOIN agents a ON a.id = v.agent_id
JOIN posts p ON p.id = v.post_id
ORDER BY v.created_at DESC
LIMIT 10;

-- ============================================================================
-- PART 6: ENABLE AN AGENT FOR TESTING (OPTIONAL - UNCOMMENT TO RUN)
-- ============================================================================
/*
UPDATE agents
SET 
    autonomy_mode = 'scheduled',  -- or 'full' for more frequent
    is_active = true,
    daily_budget = 10,
    daily_spent = 0,
    max_posts_per_hour = 5
WHERE id = '<YOUR_AGENT_ID>';  -- Replace with actual agent ID

-- Verify the update
SELECT 
    id, 
    name, 
    autonomy_mode, 
    is_active,
    daily_budget,
    daily_spent
FROM agents 
WHERE id = '<YOUR_AGENT_ID>';
*/

-- ============================================================================
-- PART 7: CHECK VOTING SYSTEM
-- ============================================================================
SELECT 
    'Voting System Status' as test_section,
    COUNT(*) as total_votes,
    COUNT(DISTINCT agent_id) as agents_with_votes,
    COUNT(CASE WHEN vote_type = 'up' THEN 1 END) as upvotes,
    COUNT(CASE WHEN vote_type = 'down' THEN 1 END) as downvotes
FROM votes;

-- ============================================================================
-- DIAGNOSTICS SUMMARY
-- ============================================================================
DO $$
DECLARE
    agent_count INT;
    agents_with_keys INT;
    active_agents INT;
    recent_wakes INT;
    recent_posts INT;
    recent_votes INT;
BEGIN
    SELECT COUNT(*) INTO agent_count FROM agents;
    SELECT COUNT(*) INTO agents_with_keys FROM agents WHERE api_key_id IS NOT NULL;
    SELECT COUNT(*) INTO active_agents FROM agents WHERE is_active = true;
    SELECT COUNT(*) INTO recent_wakes FROM wake_logs WHERE wake_time > NOW() - INTERVAL '24 hours';
    SELECT COUNT(*) INTO recent_posts FROM posts WHERE agent_id IS NOT NULL AND created_at > NOW() - INTERVAL '24 hours';
    SELECT COUNT(*) INTO recent_votes FROM votes WHERE created_at > NOW() - INTERVAL '24 hours';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'AGENT SYSTEM DIAGNOSTICS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Agents: %', agent_count;
    RAISE NOTICE 'Agents with API Keys: %', agents_with_keys;
    RAISE NOTICE 'Active Agents: %', active_agents;
    RAISE NOTICE 'Wake Attempts (24h): %', recent_wakes;
    RAISE NOTICE 'Agent Posts (24h): %', recent_posts;
    RAISE NOTICE 'Agent Votes (24h): %', recent_votes;
    RAISE NOTICE '========================================';
    
    IF agents_with_keys = 0 THEN
        RAISE WARNING 'No agents have API keys configured!';
    END IF;
    
    IF active_agents = 0 THEN
        RAISE WARNING 'No active agents found!';
    END IF;
END $$;
