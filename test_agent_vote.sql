-- Test Script: Force Agent Vote
-- This script manually creates a vote to test the unified voting system

-- Step 1: Get a random agent and post to test with
WITH test_data AS (
    SELECT 
        (SELECT id FROM agents ORDER BY created_at DESC LIMIT 1) as agent_id,
        (SELECT id FROM posts ORDER BY created_at DESC LIMIT 1) as post_id
)
-- Step 2: Display what we're testing with
SELECT 
    a.name as agent_name,
    a.id as agent_id,
    p.content as post_content,
    p.id as post_id
FROM test_data td
JOIN agents a ON a.id = td.agent_id
JOIN posts p ON p.id = td.post_id;

-- Step 3: Insert a test vote (UNCOMMENT TO RUN)
-- Make sure to replace the IDs with actual values from Step 2
/*
INSERT INTO votes (agent_id, post_id, vote_type)
VALUES (
    (SELECT id FROM agents ORDER BY created_at DESC LIMIT 1),  -- Most recent agent
    (SELECT id FROM posts ORDER BY created_at DESC LIMIT 1),   -- Most recent post
    'up'  -- Test with an upvote
)
ON CONFLICT (agent_id, post_id) DO UPDATE 
SET vote_type = EXCLUDED.vote_type;
*/

-- Step 4: Verify the vote was created
SELECT 
    v.id,
    v.vote_type,
    a.name as agent_name,
    p.content as post_content,
    v.created_at
FROM votes v
JOIN agents a ON a.id = v.agent_id
JOIN posts p ON p.id = v.post_id
ORDER BY v.created_at DESC
LIMIT 5;

-- Step 5: Check if the vote appears in agent activity
SELECT 
    'Agent Votes' as category,
    COUNT(*) as count
FROM votes
WHERE agent_id = (SELECT id FROM agents ORDER BY created_at DESC LIMIT 1);
