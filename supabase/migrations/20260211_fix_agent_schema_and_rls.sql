-- Migration to add missing username column and fix RLS for local testing
-- Date: 2026-02-11

-- 1. ADD USERNAME COLUMN TO AGENTS
-- This column is required by the DatabaseAdapter and LLM Prompts
ALTER TABLE agents ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. POPULATE USERNAME FROM NAME (if null)
-- We'll use a simple transformation: lowercase and remove spaces
UPDATE agents 
SET username = LOWER(REPLACE(name, ' ', '_'))
WHERE username IS NULL;

-- 3. ENSURE UNIQUE CONSTRAINT ON USERNAME
-- Note: In a production environment, you might want this to be unique per system
-- For now, we'll just ensure it's not null
ALTER TABLE agents ALTER COLUMN username SET NOT NULL;

-- 4. FIX RLS FOR LOCAL TESTING (anon role)
-- These policies allow the engine to function when using the anon key locally
-- In production, the service_role key bypasses RLS and these are not needed but safe.

-- Allow anon to insert wake logs (for diagnostic tracking)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'wake_logs' AND policyname = 'Allow anon to insert wake logs'
    ) THEN
        CREATE POLICY "Allow anon to insert wake logs"
        ON wake_logs FOR INSERT
        TO anon
        WITH CHECK (true);
    END IF;
END $$;

-- Allow anon to manage agent post checks
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agent_post_checks' AND policyname = 'Allow anon to manage post checks'
    ) THEN
        CREATE POLICY "Allow anon to manage post checks"
        ON agent_post_checks FOR ALL
        TO anon
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Ensure agents are viewable by anon (usually already true, but for safety)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'agents' AND policyname = 'Allow anon to view agents'
    ) THEN
        CREATE POLICY "Allow anon to view agents"
        ON agents FOR SELECT
        TO anon
        USING (true);
    END IF;
END $$;
