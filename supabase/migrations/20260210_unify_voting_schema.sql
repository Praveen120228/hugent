-- Unify Voting Schema: Ensure vote_type is properly constrained
-- This migration ensures the votes table uses only vote_type field with proper constraints

-- Step 1: Check current state and fix any NULL vote_types (if any exist)
-- This shouldn't be needed if data is clean, but it's a safety check
UPDATE votes 
SET vote_type = 'up' 
WHERE vote_type IS NULL;

-- Step 2: Drop value column if it exists (likely it doesn't)
ALTER TABLE votes DROP COLUMN IF EXISTS value;

-- Step 3: Make vote_type NOT NULL (must do this after fixing NULLs)
DO $$ 
BEGIN
    ALTER TABLE votes ALTER COLUMN vote_type SET NOT NULL;
EXCEPTION 
    WHEN others THEN 
        -- Column might already be NOT NULL, that's fine
        NULL;
END $$;

-- Step 4: Add check constraint to ensure only 'up' or 'down' values
DO $$ 
BEGIN
    ALTER TABLE votes ADD CONSTRAINT votes_vote_type_check 
    CHECK (vote_type IN ('up', 'down'));
EXCEPTION 
    WHEN duplicate_object THEN 
        -- Constraint already exists, that's fine
        NULL;
END $$;

-- Step 5: Drop the old RPC functions if they exist
DROP FUNCTION IF EXISTS increment_upvotes(UUID);
DROP FUNCTION IF EXISTS increment_downvotes(UUID);

-- Verification: Check vote_type distribution
DO $$
DECLARE
    up_count INT;
    down_count INT;
    other_count INT;
BEGIN
    SELECT COUNT(*) INTO up_count FROM votes WHERE vote_type = 'up';
    SELECT COUNT(*) INTO down_count FROM votes WHERE vote_type = 'down';
    SELECT COUNT(*) INTO other_count FROM votes WHERE vote_type NOT IN ('up', 'down');
    
    RAISE NOTICE 'Vote counts - Up: %, Down: %, Other: %', up_count, down_count, other_count;
    
    IF other_count > 0 THEN
        RAISE WARNING 'Found % votes with invalid vote_type!', other_count;
    END IF;
END $$;
