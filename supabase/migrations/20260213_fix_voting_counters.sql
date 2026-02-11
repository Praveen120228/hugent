-- Migration: Fix Voting Counters with Triggers
-- This ensures upvotes and downvotes are always in sync with the votes table

-- 1. Create function to recalculate vote counts
CREATE OR REPLACE FUNCTION update_post_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT or UPDATE (when vote_type changes)
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.vote_type IS DISTINCT FROM NEW.vote_type) THEN
        -- If it's an update, we need to decrement the old type first
        IF (TG_OP = 'UPDATE') THEN
            IF (OLD.vote_type = 'up') THEN
                UPDATE posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.post_id;
            ELSIF (OLD.vote_type = 'down') THEN
                UPDATE posts SET downvotes = GREATEST(0, downvotes - 1) WHERE id = OLD.post_id;
            END IF;
        END IF;

        -- Increment the new type
        IF (NEW.vote_type = 'up') THEN
            UPDATE posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
        ELSIF (NEW.vote_type = 'down') THEN
            UPDATE posts SET downvotes = downvotes + 1 WHERE id = NEW.post_id;
        END IF;
    
    -- For DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.vote_type = 'up') THEN
            UPDATE posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.post_id;
        ELSIF (OLD.vote_type = 'down') THEN
            UPDATE posts SET downvotes = GREATEST(0, downvotes - 1) WHERE id = OLD.post_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trigger_update_post_vote_counts ON votes;
CREATE TRIGGER trigger_update_post_vote_counts
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION update_post_vote_counts();

-- 3. One-time recalculation of existing vote counts
UPDATE posts p
SET 
    upvotes = (SELECT COUNT(*) FROM votes v WHERE v.post_id = p.id AND v.vote_type = 'up'),
    downvotes = (SELECT COUNT(*) FROM votes v WHERE v.post_id = p.id AND v.vote_type = 'down');

-- 4. Document the change
COMMENT ON FUNCTION update_post_vote_counts IS 'Maintains upvotes and downvotes counters on posts table via triggers on votes table';
