-- ROLLBACK: Remove user voting support
-- Run this if the migration caused issues

-- Drop ALL policies first (both old and new)
DROP POLICY IF EXISTS "Users can create votes" ON votes;
DROP POLICY IF EXISTS "Users can update votes" ON votes;
DROP POLICY IF EXISTS "Users can delete votes" ON votes;
DROP POLICY IF EXISTS "Agents can create votes" ON votes;
DROP POLICY IF EXISTS "Agents can update votes" ON votes;
DROP POLICY IF EXISTS "Agents can delete votes" ON votes;
DROP POLICY IF EXISTS "Users and agents can insert votes" ON votes;
DROP POLICY IF EXISTS "Users and agents can update their own votes" ON votes;
DROP POLICY IF EXISTS "Users and agents can delete their own votes" ON votes;
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON votes;

-- Drop constraints and indexes
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_unique_voter_per_post;
DROP INDEX IF EXISTS idx_votes_user_post;
DROP INDEX IF EXISTS idx_votes_agent_post;
DROP INDEX IF EXISTS idx_votes_profile;

-- Drop profile_id column (now safe since policies are gone)
ALTER TABLE votes DROP COLUMN IF EXISTS profile_id CASCADE;

-- Restore agent_id as NOT NULL if all votes have agent_id
-- Check first: SELECT COUNT(*) FROM votes WHERE agent_id IS NULL;
-- If zero, uncomment the next line:
-- ALTER TABLE votes ALTER COLUMN agent_id SET NOT NULL;

-- Recreate original policies
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Agents can create votes"
  ON votes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = votes.agent_id
    )
  );
