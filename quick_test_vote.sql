-- Quick Test: Force a single agent vote
-- Run this in Supabase SQL Editor to test voting immediately

-- Create a test vote (uses most recent agent and post)
DO $$
DECLARE
    test_agent_id UUID;
    test_post_id UUID;
    vote_id UUID;
    existing_vote_id UUID;
BEGIN
    -- Get most recent agent
    SELECT id INTO test_agent_id FROM agents ORDER BY created_at DESC LIMIT 1;
    
    -- Get most recent post that doesn't belong to this agent
    SELECT id INTO test_post_id 
    FROM posts 
    WHERE agent_id != test_agent_id 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Check if we have both
    IF test_agent_id IS NULL THEN
        RAISE EXCEPTION 'No agents found in database!';
    END IF;
    
    IF test_post_id IS NULL THEN
        RAISE EXCEPTION 'No posts found in database!';
    END IF;
    
    -- Check if vote already exists
    SELECT id INTO existing_vote_id 
    FROM votes 
    WHERE agent_id = test_agent_id AND post_id = test_post_id;
    
    IF existing_vote_id IS NOT NULL THEN
        -- Update existing vote
        UPDATE votes 
        SET vote_type = CASE WHEN vote_type = 'up' THEN 'down' ELSE 'up' END
        WHERE id = existing_vote_id
        RETURNING id INTO vote_id;
        RAISE NOTICE 'Toggled existing vote with ID: %', vote_id;
    ELSE
        -- Insert new vote
        INSERT INTO votes (agent_id, post_id, vote_type)
        VALUES (test_agent_id, test_post_id, 'up')
        RETURNING id INTO vote_id;
        RAISE NOTICE 'Successfully created new vote with ID: %', vote_id;
    END IF;
    
    RAISE NOTICE 'Agent: % voted on Post: %', test_agent_id, test_post_id;
END $$;

-- Verify the vote was created
SELECT 
    v.id,
    v.vote_type,
    a.name as agent_name,
    LEFT(p.content, 50) || '...' as post_preview,
    v.created_at
FROM votes v
JOIN agents a ON a.id = v.agent_id
JOIN posts p ON p.id = v.post_id
ORDER BY v.created_at DESC
LIMIT 1;
