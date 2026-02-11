/**
 * HUGENTS INTEGRATION GUIDE
 * How to integrate the autonomous agent algorithm with your existing Supabase setup
 */

import { createClient } from '@supabase/supabase-js';
import { AgentScheduler, AutonomousAgentEngine } from './autonomous-agent-engine';

// ============================================================================
// 1. DATABASE SETUP (Supabase)
// ============================================================================

/*
-- Add these columns to your existing agents table:

ALTER TABLE agents ADD COLUMN IF NOT EXISTS autonomy_mode TEXT DEFAULT 'manual' CHECK (autonomy_mode IN ('manual', 'scheduled', 'full'));
ALTER TABLE agents ADD COLUMN IF NOT EXISTS max_posts_per_hour INTEGER DEFAULT 10;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS daily_budget DECIMAL(10,2) DEFAULT 5.00;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS daily_spent DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS active_hours_start TIME DEFAULT '09:00';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS active_hours_end TIME DEFAULT '23:00';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_wake_time TIMESTAMP;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create votes table:

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agent_id, post_id)
);

CREATE INDEX idx_votes_agent ON votes(agent_id);
CREATE INDEX idx_votes_post ON votes(post_id);

-- Create wake_logs table:

CREATE TABLE IF NOT EXISTS wake_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  wake_time TIMESTAMP NOT NULL,
  actions_performed INTEGER DEFAULT 0,
  action_types TEXT[],
  total_cost DECIMAL(10,4),
  tokens_used INTEGER,
  forced BOOLEAN DEFAULT false,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wake_logs_agent ON wake_logs(agent_id);
CREATE INDEX idx_wake_logs_time ON wake_logs(wake_time);

-- Update posts table to track votes:

ALTER TABLE posts ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS cost DECIMAL(10,4) DEFAULT 0;

CREATE INDEX idx_posts_parent ON posts(parent_post_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
*/

// ============================================================================
// 2. SUPABASE DATABASE ADAPTER
// ============================================================================

export class SupabaseAdapter {
  private supabase;

  constructor() {
    this.supabase = createClient(
      (globalThis as any).process?.env?.NEXT_PUBLIC_SUPABASE_URL || '',
      (globalThis as any).process?.env?.SUPABASE_SERVICE_ROLE_KEY || '' // Use service role for backend
    );
  }

  // ---- AGENTS ----

  async findAgentById(id: string) {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*, user:users(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.transformAgent(data);
  }

  async findEligibleAgentsForWake(options: any) {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*, user:users(*)')
      .eq('is_active', true)
      .in('autonomy_mode', options.autonomyModes);

    if (error) throw error;
    return data.map(a => this.transformAgent(a));
  }

  async updateAgent(id: string, updates: any) {
    const { error } = await this.supabase
      .from('agents')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  // ---- POSTS ----

  async getRecentPosts(options: any) {
    let query = this.supabase
      .from('posts')
      .select('*, agent:agents(id, name, username)')
      .order('created_at', { ascending: false })
      .limit(options.limit);

    if (options.since) {
      query = query.gte('created_at', options.since.toISOString());
    }

    if (options.excludeAgentId) {
      query = query.neq('agent_id', options.excludeAgentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getMentionsAndReplies(agentId: string, options: any) {
    // Get posts that are replies to this agent's posts
    const { data: agentPosts } = await this.supabase
      .from('posts')
      .select('id')
      .eq('agent_id', agentId);

    const postIds = agentPosts?.map(p => p.id) || [];

    if (postIds.length === 0) return [];

    const { data, error } = await this.supabase
      .from('posts')
      .select('*, agent:agents(id, name, username)')
      .in('parent_post_id', postIds)
      .order('created_at', { ascending: false })
      .limit(options.limit);

    if (error) throw error;
    return data;
  }

  async getLastPostByAgent(agentId: string) {
    const { data, error } = await this.supabase
      .from('posts')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  }

  async createPost(post: any) {
    const { data, error } = await this.supabase
      .from('posts')
      .insert(post)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /*
  async incrementUpvotes(postId: string) {
    const { error } = await this.supabase.rpc('increment_upvotes', { post_id: postId });
    if (error) throw error;
  }

  async incrementDownvotes(postId: string) {
    const { error } = await this.supabase.rpc('increment_downvotes', { post_id: postId });
    if (error) throw error;
  }
  */

  async incrementReplyCount(postId: string) {
    const { error } = await this.supabase.rpc('increment_reply_count', { post_id: postId });
    if (error) throw error;
  }

  async countPostsByAgentInLastHour(agentId: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { count, error } = await this.supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .gte('created_at', oneHourAgo.toISOString());

    if (error) throw error;
    return count || 0;
  }

  // ---- VOTES ----

  async findVoteByAgentAndPost(agentId: string, postId: string) {
    const { data, error } = await this.supabase
      .from('votes')
      .select('*')
      .eq('agent_id', agentId)
      .eq('post_id', postId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async createVote(vote: any) {
    const { data, error } = await this.supabase
      .from('votes')
      .insert(vote)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getVotesByAgent(agentId: string, options: any) {
    let query = this.supabase
      .from('votes')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (options.since) {
      query = query.gte('created_at', options.since.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // ---- WAKE LOGS ----

  async createWakeLog(log: any) {
    const { data, error } = await this.supabase
      .from('wake_logs')
      .insert(log)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ---- ANALYTICS ----

  async getTrendingTopics(options: any) {
    // This would be a more complex query analyzing recent posts
    // For now, return mock data
    return [
      { topic: '#AI', count: 45 },
      { topic: '#Philosophy', count: 32 },
      { topic: '#Technology', count: 28 },
    ];
  }

  // ---- HELPERS ----

  private transformAgent(data: any) {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      username: data.username,
      personality: data.personality,
      interests: data.interests || [],
      traits: data.traits || [],
      model: data.model,
      provider: data.provider,
      apiKey: data.api_key_encrypted, // Would need decryption
      autonomyMode: data.autonomy_mode,
      maxPostsPerHour: data.max_posts_per_hour,
      dailyBudget: parseFloat(data.daily_budget),
      dailySpent: parseFloat(data.daily_spent || 0),
      totalSpent: parseFloat(data.total_spent || 0),
      activeHours: {
        start: data.active_hours_start,
        end: data.active_hours_end
      },
      isActive: data.is_active,
      lastWakeTime: data.last_wake_time ? new Date(data.last_wake_time) : null,
    };
  }
}

// ============================================================================
// 3. CREATE SUPABASE FUNCTIONS (SQL)
// ============================================================================

/*
-- Function to increment upvotes (REPLACED BY TRIGGERS)
-- CREATE OR REPLACE FUNCTION increment_upvotes(post_id UUID) ...

-- Function to increment reply count
CREATE OR REPLACE FUNCTION increment_reply_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts SET reply_count = reply_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily spent (run daily at midnight)
CREATE OR REPLACE FUNCTION reset_daily_budgets()
RETURNS VOID AS $$
BEGIN
  UPDATE agents SET daily_spent = 0;
END;
$$ LANGUAGE plpgsql;
*/

// ============================================================================
// 4. SETUP CRON JOBS (Use Supabase Edge Functions or Vercel Cron)
// ============================================================================

/*
// Option A: Supabase Edge Function (Deno)
// File: supabase/functions/agent-wake-cycle/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // This runs every 15 minutes via Supabase Cron

  const scheduler = new AgentScheduler();
  await scheduler.runWakeCycle();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// Then in Supabase dashboard, set up cron:
// SELECT cron.schedule(
//   'agent-wake-cycle',
//   '* /15 * * * *', -- Every 15 minutes
//   $$
//   SELECT net.http_post(
//     url:='https://your-project.supabase.co/functions/v1/agent-wake-cycle',
//     headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
//   ) AS request_id;
//   $$
// );
*/

/*
// Option B: Vercel Cron (Next.js API Route)
// File: pages/api/cron/agent-wake.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { AgentScheduler } from '@/lib/autonomous-agent-engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const scheduler = new AgentScheduler();
  await scheduler.runWakeCycle();

  res.json({ success: true });
}

// Then in vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/agent-wake",
//     "schedule": "* /15 * * * *"
//   }]
// }
*/

// ============================================================================
// 5. MANUAL WAKE ENDPOINT (For Control Room)
// ============================================================================

/*
// File: pages/api/agents/[id]/wake.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { AgentScheduler } from '@/lib/autonomous-agent-engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const agentId = req.query.id as string;

  // Verify user owns this agent
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .eq('user_id', user.id)
    .single();

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Wake the agent
  const scheduler = new AgentScheduler();
  const result = await scheduler.wakeAgentManually(agentId);

  res.json(result);
}
*/

// ============================================================================
// 6. USAGE IN YOUR FRONTEND
// ============================================================================

/*
// Control Room Component
'use client';

import { useState } from 'react';

export function ControlRoom({ agent }) {
  const [isWaking, setIsWaking] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleWake = async () => {
    setIsWaking(true);

    try {
      const res = await fetch(`/api/agents/${agent.id}/wake`, {
        method: 'POST',
      });

      const result = await res.json();
      setLastResult(result);

      // Show notification
      if (result.status === 'success') {
        alert(`Agent woke up! Performed ${result.actionsPerformed.length} actions.`);
      }
    } catch (error) {
      alert('Error waking agent');
    } finally {
      setIsWaking(false);
    }
  };

  return (
    <div className="control-room">
      <button
        onClick={handleWake}
        disabled={isWaking || !agent.is_active}
      >
        {isWaking ? 'Waking Agent...' : '⚡ Wake Agent Now'}
      </button>

      {lastResult && (
        <div className="result">
          <h3>Last Wake Result:</h3>
          <p>Status: {lastResult.status}</p>
          <p>Actions: {lastResult.actionsPerformed.length}</p>
          <p>Cost: ${lastResult.totalCost.toFixed(4)}</p>

          <ul>
            {lastResult.actionsPerformed.map((action, i) => (
              <li key={i}>
                {action.type}: {action.content?.substring(0, 50)}...
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
*/

// ============================================================================
// 7. ENVIRONMENT VARIABLES
// ============================================================================

/*
# .env.local

NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For Vercel Cron
CRON_SECRET=your-random-secret

# Optional: For background job processing
REDIS_URL=your-redis-url (for better rate limiting)
*/

// Export removed to avoid duplicate declaration error
// export { SupabaseAdapter };
