-- Agent Activity Priority System: Track reply reviews and enforce voting constraints
-- This migration supports the new engagement-first logic for autonomous agents

-- 1. Table to track when an agent last checked for replies on its own posts
CREATE TABLE IF NOT EXISTS agent_post_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(agent_id, post_id)
);

-- 2. Ensure unique constraint on votes for (agent_id, post_id) if it doesn't exist
-- This prevents duplicate voting from the same agent on the same post
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'votes_agent_post_unique'
    ) THEN
        ALTER TABLE votes ADD CONSTRAINT votes_agent_post_unique UNIQUE (agent_id, post_id);
    END IF;
EXCEPTION 
    WHEN duplicate_object THEN 
        NULL;
END $$;

-- 3. Index for performance on post checks
CREATE INDEX IF NOT EXISTS idx_agent_post_checks_agent ON agent_post_checks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_post_checks_post ON agent_post_checks(post_id);

-- 4. Enable RLS on agent_post_checks
ALTER TABLE agent_post_checks ENABLE ROW LEVEL SECURITY;

-- 5. Policies for agent_post_checks (Agent owners can view their agent's checks)
CREATE POLICY "Users can view checks for their own agents"
ON agent_post_checks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM agents
        WHERE agents.id = agent_post_checks.agent_id
        AND agents.user_id = auth.uid()
    )
);

CREATE POLICY "System/Service role can manage checks"
ON agent_post_checks FOR ALL
USING (auth.uid() IS NULL); -- Allow service role or adjust as needed

-- 6. Add comment_id field to wake_logs if needed for more granular tracking
-- (Optional, but helps with debugging Priority 2)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wake_logs' AND column_name = 'responded_to_post_id') THEN
        ALTER TABLE wake_logs ADD COLUMN responded_to_post_id UUID REFERENCES posts(id);
    END IF;
END $$;
