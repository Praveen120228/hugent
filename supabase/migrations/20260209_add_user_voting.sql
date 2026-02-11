-- Migration: Add profile_id support to votes table for user voting
-- This allows both users (via profile_id) and agents (via agent_id) to vote

-- Add profile_id column (nullable to support existing agent votes)
ALTER TABLE votes
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make agent_id nullable since votes can now come from users OR agents
ALTER TABLE votes
ALTER COLUMN agent_id DROP NOT NULL;

-- Drop the old unique constraint
ALTER TABLE votes
DROP CONSTRAINT IF EXISTS votes_agent_id_post_id_key;

-- Add new constraint: each post can have only ONE vote per agent OR user
-- User votes identified by profile_id, agent votes by agent_id
ALTER TABLE votes
ADD CONSTRAINT votes_unique_voter_per_post 
CHECK (
  (agent_id IS NOT NULL AND profile_id IS NULL) OR
  (agent_id IS NULL AND profile_id IS NOT NULL)
);

-- Create unique index for user votes
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_user_post 
ON votes(profile_id, post_id) 
WHERE profile_id IS NOT NULL;

-- Create unique index for agent votes
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_agent_post 
ON votes(agent_id, post_id) 
WHERE agent_id IS NOT NULL;

-- Create index on profile_id
CREATE INDEX IF NOT EXISTS idx_votes_profile ON votes(profile_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Agents can create votes" ON votes;
DROP POLICY IF EXISTS "Agents can update votes" ON votes;
DROP POLICY IF EXISTS "Agents can delete votes" ON votes;
DROP POLICY IF EXISTS "Users can create votes" ON votes;
DROP POLICY IF EXISTS "Users can update votes" ON votes;
DROP POLICY IF EXISTS "Users can delete votes" ON votes;

-- Allow agents to insert votes
CREATE POLICY "Agents can create votes"
  ON votes FOR INSERT
  WITH CHECK (
    agent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = votes.agent_id
    )
  );

-- Allow users to insert votes  
CREATE POLICY "Users can create votes"
  ON votes FOR INSERT
  WITH CHECK (
    profile_id IS NOT NULL
    AND profile_id = auth.uid()
  );

-- Allow agents to update their own votes
CREATE POLICY "Agents can update votes"
  ON votes FOR UPDATE
  USING (
    agent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = votes.agent_id
    )
  );

-- Allow users to update their own votes
CREATE POLICY "Users can update votes"
  ON votes FOR UPDATE
  USING (
    profile_id IS NOT NULL
    AND profile_id = auth.uid()
  );

-- Allow agents to delete their own votes
CREATE POLICY "Agents can delete votes"
  ON votes FOR DELETE
  USING (
    agent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = votes.agent_id
    )
  );

-- Allow users to delete their own votes
CREATE POLICY "Users can delete votes"
  ON votes FOR DELETE
  USING (
    profile_id IS NOT NULL
    AND profile_id = auth.uid()
  );

-- Add comment
COMMENT ON COLUMN votes.profile_id IS 'User who voted (for user votes)';
