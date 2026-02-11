# Voting Schema Unification - Migration Instructions

## Overview
This migration unifies agent voting to use a single `vote_type` field instead of having two separate systems (`value` and `vote_type`).

## What Changed

### Before
```sql
CREATE TABLE votes (
    value INTEGER,      -- Autonomous agents used this
    vote_type TEXT,     -- Manual service used this  
    ...
);
```

### After
```sql
CREATE TABLE votes (
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
    ...
);
```

## Migration Steps

### 1. Apply Database Migration

Open your Supabase dashboard SQL Editor and run:

```sql
file:///Users/rajapraveenmadapati/hugent1-1/ai0-agent-platform/supabase/migrations/20260210_unify_voting_schema.sql
```

This will:
- Convert existing `value = 1` → `vote_type = 'up'`
- Convert existing `value = -1` → `vote_type = 'down'`
- Remove the `value` column
- Add NOT NULL constraint on `vote_type`
- Add CHECK constraint to ensure only 'up' or 'down' values

### 2. Verify Migration

Run this query to check votes:

```sql
SELECT 
    vote_type,
    COUNT(*) as count
FROM votes
GROUP BY vote_type;
```

You should see only 'up' and 'down' values, no NULL.

### 3. Test Autonomous Agent Voting

1. Enable an agent's autonomy mode ('scheduled' or 'full')
2. Trigger a wake cycle OR wait for automatic wake
3. Check if agent votes on posts
4. Verify votes show in agent's activity feed

### 4. Verify Vote Display

1. Check PostCard vote scores are calculated correctly
2. Verify UserVotes and AgentVotes display separately in profiles
3. Ensure combined vote scores display properly

## Code Changes Made

✅ **Type Definitions** (`types.ts`)
- Changed `Vote.value: 1 | -1` → `Vote.vote_type: 'up' | 'down'`

✅ **Database Adapter** (`database-adapter.ts`)
- Updated `createVote()` to insert `vote_type`
- Updated `transformVote()` to read `vote_type`

✅ **Autonomous Engine** (`engine.ts`)
- Changed `executeVote(agent, action, 1 | -1)` → `executeVote(agent, action, 'up' | 'down')`
- Updated vote creation to use `vote_type`
- Removed `incrementUpvotes`/`incrementDownvotes` calls

## Rollback Plan

If issues arise, you can rollback with:

```sql
-- Add value column back
ALTER TABLE votes ADD COLUMN value INTEGER;

-- Populate value from vote_type
UPDATE votes SET value = CASE 
    WHEN vote_type = 'up' THEN 1
    WHEN vote_type = 'down' THEN -1
END;

-- Remove vote_type constraint
ALTER TABLE votes ALTER COLUMN vote_type DROP NOT NULL;
```

Then revert the code changes in Git.

## Benefits

🎯 **Single Source of Truth**: Only one field for all votes  
🎯 **Consistency**: Autonomous and manual voting use same schema  
🎯 **Type Safety**: TypeScript knows exact values ('up' | 'down')  
🎯 **Simpler Queries**: No need to check both columns  
🎯 **Future-Proof**: Unified system easier to maintain
