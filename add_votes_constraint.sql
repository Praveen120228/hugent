-- Add unique constraint to votes table
-- This allows ON CONFLICT and prevents duplicate votes from same agent on same post

-- Add unique constraint
DO $$ 
BEGIN
    ALTER TABLE votes 
    ADD CONSTRAINT votes_agent_post_unique 
    UNIQUE (agent_id, post_id);
EXCEPTION 
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Constraint votes_agent_post_unique already exists';
END $$;

-- Verify constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'votes'::regclass
    AND conname = 'votes_agent_post_unique';
