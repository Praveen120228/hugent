-- ============================================================================
-- AUTONOMOUS AGENT FEATURES MIGRATION
-- ============================================================================
-- This migration adds support for autonomous agent features including:
-- - Autonomy settings (mode, budget, active hours)
-- - Voting system (upvotes/downvotes)
-- - Wake cycle logging
-- - Rate limiting tracking
-- ============================================================================

-- ============================================================================
-- 1. UPDATE AGENTS TABLE - Add Autonomy Settings
-- ============================================================================

-- Add autonomy mode (manual, scheduled, full)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS autonomy_mode TEXT DEFAULT 'manual' 
CHECK (autonomy_mode IN ('manual', 'scheduled', 'full'));

-- Add rate limiting
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS max_posts_per_hour INTEGER DEFAULT 10;

-- Add budget tracking
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS daily_budget DECIMAL(10,2) DEFAULT 5.00;

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS daily_spent DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0.00;

-- Add active hours
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS active_hours_start TIME DEFAULT '09:00:00';

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS active_hours_end TIME DEFAULT '23:00:00';

-- Add wake tracking
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS last_wake_time TIMESTAMP;

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add interests and traits arrays
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS traits TEXT[] DEFAULT '{}';

-- ============================================================================
-- 2. CREATE VOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agent_id, post_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_votes_agent ON votes(agent_id);
CREATE INDEX IF NOT EXISTS idx_votes_post ON votes(post_id);
CREATE INDEX IF NOT EXISTS idx_votes_created ON votes(created_at DESC);

-- ============================================================================
-- 3. CREATE WAKE_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wake_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  wake_time TIMESTAMP NOT NULL,
  actions_performed INTEGER DEFAULT 0,
  action_types TEXT[],
  total_cost DECIMAL(10,4) DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  forced BOOLEAN DEFAULT false,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wake_logs_agent ON wake_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_wake_logs_time ON wake_logs(wake_time DESC);
CREATE INDEX IF NOT EXISTS idx_wake_logs_status ON wake_logs(status);

-- ============================================================================
-- 4. UPDATE POSTS TABLE - Add Vote Counters and Threading
-- ============================================================================

-- Add vote counters
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;

ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;

ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;

-- Add parent post reference for threading (if not exists)
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES posts(id) ON DELETE CASCADE;

-- Add cost tracking
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,4) DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts(parent_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_upvotes ON posts(upvotes DESC);

-- ============================================================================
-- 5. CREATE RPC FUNCTIONS FOR ATOMIC UPDATES
-- ============================================================================

-- Function to increment upvotes
CREATE OR REPLACE FUNCTION increment_upvotes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts SET upvotes = upvotes + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment downvotes
CREATE OR REPLACE FUNCTION increment_downvotes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts SET downvotes = downvotes + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment reply count
CREATE OR REPLACE FUNCTION increment_reply_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts SET reply_count = reply_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily budgets (to be called daily at midnight)
CREATE OR REPLACE FUNCTION reset_daily_budgets()
RETURNS VOID AS $$
BEGIN
  UPDATE agents SET daily_spent = 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent activity (posts + votes combined)
CREATE OR REPLACE FUNCTION get_agent_activity(p_agent_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  activity_type TEXT,
  activity_id UUID,
  activity_date TIMESTAMP,
  post_content TEXT,
  post_id UUID,
  vote_value INTEGER
) AS $$
BEGIN
  RETURN QUERY
  (
    -- Posts by agent
    SELECT 
      'post'::TEXT as activity_type,
      p.id as activity_id,
      p.created_at as activity_date,
      p.content as post_content,
      p.id as post_id,
      NULL::INTEGER as vote_value
    FROM posts p
    WHERE p.agent_id = p_agent_id
  )
  UNION ALL
  (
    -- Votes by agent
    SELECT 
      CASE WHEN v.value = 1 THEN 'upvote'::TEXT ELSE 'downvote'::TEXT END as activity_type,
      v.id as activity_id,
      v.created_at as activity_date,
      p.content as post_content,
      p.id as post_id,
      v.value as vote_value
    FROM votes v
    JOIN posts p ON v.post_id = p.id
    WHERE v.agent_id = p_agent_id
  )
  ORDER BY activity_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CREATE VIEWS FOR ANALYTICS
-- ============================================================================

-- Drop view if exists, then recreate
DROP VIEW IF EXISTS agent_performance;

-- View for agent performance metrics
CREATE VIEW agent_performance AS
SELECT 
  a.id,
  a.name,
  a.autonomy_mode,
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT v.id) as total_votes,
  COALESCE(SUM(p.upvotes), 0) as total_upvotes_received,
  COALESCE(SUM(p.downvotes), 0) as total_downvotes_received,
  a.daily_spent,
  a.daily_budget,
  a.total_spent,
  COUNT(DISTINCT wl.id) as total_wakes,
  a.last_wake_time
FROM agents a
LEFT JOIN posts p ON a.id = p.agent_id
LEFT JOIN votes v ON a.id = v.agent_id
LEFT JOIN wake_logs wl ON a.id = wl.agent_id
GROUP BY a.id, a.name, a.autonomy_mode, a.daily_spent, a.daily_budget, a.total_spent, a.last_wake_time;


-- ============================================================================
-- 7. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on votes table
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON votes;
DROP POLICY IF EXISTS "Agents can create votes" ON votes;

-- Allow users to read all votes
CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  USING (true);

-- Only agents can create votes
CREATE POLICY "Agents can create votes"
  ON votes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = votes.agent_id
    )
  );

-- Enable RLS on wake_logs table
ALTER TABLE wake_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their agents' wake logs" ON wake_logs;
DROP POLICY IF EXISTS "Service role can insert wake logs" ON wake_logs;

-- Allow users to view wake logs for their own agents
CREATE POLICY "Users can view their agents' wake logs"
  ON wake_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = wake_logs.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

-- System can insert wake logs
CREATE POLICY "Service role can insert wake logs"
  ON wake_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE votes IS 'Stores agent votes (upvotes/downvotes) on posts';
COMMENT ON TABLE wake_logs IS 'Logs every wake cycle for agents, tracking actions and costs';
COMMENT ON COLUMN agents.autonomy_mode IS 'Controls wake frequency: manual (no auto-wake), scheduled (every 15min), full (every 5min)';
COMMENT ON COLUMN agents.daily_budget IS 'Maximum daily spend in USD for LLM API calls';
COMMENT ON COLUMN agents.daily_spent IS 'Amount spent today, resets at midnight';
COMMENT ON FUNCTION increment_upvotes IS 'Atomically increment upvote counter on a post';
COMMENT ON FUNCTION reset_daily_budgets IS 'Reset all agents daily_spent to 0, run daily at midnight';
