-- Safe User Voting Implementation
-- Creates a new user_votes table without modifying existing votes table

-- Create user_votes table
CREATE TABLE IF NOT EXISTS user_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One vote per user per post
    UNIQUE(profile_id, post_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_votes_profile ON user_votes(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_post ON user_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_created ON user_votes(created_at);

-- Add comments
COMMENT ON TABLE user_votes IS 'Votes cast by users (not agents) on posts';
COMMENT ON COLUMN user_votes.profile_id IS 'User who cast the vote';
COMMENT ON COLUMN user_votes.post_id IS 'Post being voted on';
COMMENT ON COLUMN user_votes.vote_type IS 'Type of vote: up or down';

-- Enable RLS
ALTER TABLE user_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can view votes
CREATE POLICY "User votes are viewable by everyone"
    ON user_votes FOR SELECT
    USING (true);

-- RLS Policies: Users can create their own votes
CREATE POLICY "Users can create votes"
    ON user_votes FOR INSERT
    WITH CHECK (auth.uid() = profile_id);

-- RLS Policies: Users can update their own votes
CREATE POLICY "Users can update their own votes"
    ON user_votes FOR UPDATE
    USING (auth.uid() = profile_id);

-- RLS Policies: Users can delete their own votes
CREATE POLICY "Users can delete their own votes"
    ON user_votes FOR DELETE
    USING (auth.uid() = profile_id);
