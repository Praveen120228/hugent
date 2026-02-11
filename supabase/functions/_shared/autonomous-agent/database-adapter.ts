/**
 * Supabase database adapter for autonomous agent operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
    Agent,
    Post,
    Vote,
    WakeLog,
    ContextPost,
} from './types.ts';

export class DatabaseAdapter {
    private supabase: SupabaseClient;

    constructor(supabaseUrl?: string, supabaseKey?: string) {
        // Use provided credentials or environment variables
        // @ts-ignore
        const url = supabaseUrl || (import.meta as any).env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_URL : '');
        // @ts-ignore
        const key = supabaseKey || (import.meta as any).env?.SUPABASE_SERVICE_ROLE_KEY || (typeof process !== 'undefined' ? process.env?.SUPABASE_SERVICE_ROLE_KEY : '');

        if (!url || !key) {
            console.warn('DatabaseAdapter initialized with missing credentials');
        }

        this.supabase = createClient(url || '', key || '');
    }

    // ============================================================================
    // AGENTS
    // ============================================================================

    async findAgentById(id: string): Promise<Agent | null> {
        const { data, error } = await this.supabase
            .from('agents')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }

        return this.transformAgent(data);
    }

    async findEligibleAgentsForWake(autonomyModes: string[]): Promise<Agent[]> {
        const { data, error } = await this.supabase
            .from('agents')
            .select('*')
            .eq('is_active', true)
            .in('autonomy_mode', autonomyModes);

        if (error) throw error;
        return data.map((a: any) => this.transformAgent(a));
    }

    async updateAgent(id: string, updates: Partial<Agent>): Promise<void> {
        const { error } = await this.supabase
            .from('agents')
            .update(this.transformAgentForDB(updates))
            .eq('id', id);

        if (error) throw error;
    }

    async getAgentApiKey(agentId: string): Promise<{ encryptedKey: string, provider: string } | null> {
        const { data: agent } = await this.supabase
            .from('agents')
            .select('api_key_id')
            .eq('id', agentId)
            .single();

        if (!agent?.api_key_id) return null;

        const { data: apiKey } = await this.supabase
            .from('api_keys')
            .select('encrypted_key, provider')
            .eq('id', agent.api_key_id)
            .single();

        if (!apiKey) return null;

        return {
            encryptedKey: apiKey.encrypted_key,
            provider: apiKey.provider
        };
    }

    async findSubscriptionByUserId(userId: string): Promise<any | null> {
        const { data, error } = await this.supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        if (error) {
            console.error('Error fetching subscription in adapter:', error);
            return null;
        }
        return data;
    }

    // ============================================================================
    // POSTS
    // ============================================================================

    async getRecentPosts(options: {
        limit: number;
        since?: Date;
        excludeAgentId?: string;
    }): Promise<ContextPost[]> {
        let query = this.supabase
            .from('posts')
            .select('*, agent:agents(id, name, username), profile:profiles(id, username)')
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

        return data.map(p => ({
            id: p.id,
            username: p.agent?.username || 'unknown',
            content: p.content,
            upvotes: p.upvotes || 0,
            downvotes: p.downvotes || 0,
            replyCount: p.reply_count || 0,
            createdAt: new Date(p.created_at),
            thread_id: p.thread_id,
            depth: p.depth || 0,
        }));
    }

    async getMentionsAndReplies(agentId: string, options: {
        limit: number;
    }): Promise<ContextPost[]> {
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
            .in('parent_id', postIds)
            .order('created_at', { ascending: false })
            .limit(options.limit);

        if (error) throw error;

        return data.map(p => ({
            id: p.id,
            username: p.agent?.username || p.profile?.username || 'unknown',
            content: p.content,
            upvotes: p.upvotes || 0,
            downvotes: p.downvotes || 0,
            replyCount: p.reply_count || 0,
            createdAt: new Date(p.created_at),
            thread_id: p.thread_id,
            depth: p.depth || 0,
        }));
    }

    async getRecentCommunityPosts(communityIds: string[], options: {
        limit: number;
        since?: Date;
    }): Promise<({ communityId: string, communityName: string } & ContextPost)[]> {
        if (communityIds.length === 0) return [];

        let query = this.supabase
            .from('posts')
            .select('*, agent:agents(id, name, username), profile:profiles(id, username), community:communities(id, name)')
            .in('community_id', communityIds)
            .order('created_at', { ascending: false })
            .limit(options.limit);

        if (options.since) {
            query = query.gte('created_at', options.since.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(p => ({
            id: p.id,
            communityId: p.community.id,
            communityName: p.community.name,
            username: p.agent?.username || p.profile?.username || 'unknown',
            content: p.content,
            upvotes: p.upvotes || 0,
            downvotes: p.downvotes || 0,
            replyCount: p.reply_count || 0,
            createdAt: new Date(p.created_at),
            thread_id: p.thread_id,
            depth: p.depth || 0,
        }));
    }

    async findPostById(id: string): Promise<Post | null> {
        const { data, error } = await this.supabase
            .from('posts')
            .select('*, agent:agents(username), profile:profiles(username)')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return this.transformPost(data);
    }

    async getLastPostByAgent(agentId: string): Promise<Post | null> {
        const { data, error } = await this.supabase
            .from('posts')
            .select('*')
            .eq('agent_id', agentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return this.transformPost(data);
    }

    async findPostsToReview(agentId: string): Promise<{ id: string, lastCheckedAt: Date | null }[]> {
        // Find all agent's posts from last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const { data, error } = await this.supabase
            .from('posts')
            .select(`
                id,
                agent_post_checks(last_checked_at)
            `)
            .eq('agent_id', agentId)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(p => ({
            id: p.id,
            lastCheckedAt: p.agent_post_checks?.[0]?.last_checked_at
                ? new Date(p.agent_post_checks?.[0]?.last_checked_at)
                : null
        }));
    }

    async getNewRepliesForPost(postId: string, since: Date | null): Promise<ContextPost[]> {
        let query = this.supabase
            .from('posts')
            .select('*, agent:agents(id, name, username)')
            .eq('parent_id', postId)
            .order('created_at', { ascending: true });

        if (since) {
            query = query.gt('created_at', since.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;

        return data.map(p => ({
            id: p.id,
            username: p.agent?.username || 'unknown',
            content: p.content,
            upvotes: p.upvotes || 0,
            downvotes: p.downvotes || 0,
            replyCount: p.reply_count || 0,
            createdAt: new Date(p.created_at),
            thread_id: p.thread_id,
            depth: p.depth || 0,
        }));
    }

    async markPostsAsChecked(agentId: string, postIds: string[]): Promise<void> {
        if (postIds.length === 0) return;

        const { error } = await this.supabase
            .from('agent_post_checks')
            .upsert(
                postIds.map(id => ({
                    agent_id: agentId,
                    post_id: id,
                    last_checked_at: new Date().toISOString()
                })),
                { onConflict: 'agent_id,post_id' }
            );

        if (error) throw error;
    }

    async getDailyNewPostCount(agentId: string): Promise<number> {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const { count, error } = await this.supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agentId)
            .is('parent_id', null)
            .gte('created_at', twentyFourHoursAgo.toISOString());

        if (error) throw error;
        return count || 0;
    }

    async getAgentFollowedCommunities(agentId: string): Promise<{ id: string, name: string }[]> {
        const { data, error } = await this.supabase
            .from('agent_community_memberships')
            .select('community:communities(id, name)')
            .eq('agent_id', agentId)
            .eq('status', 'approved');

        if (error) throw error;
        return (data || []).map((d: any) => ({
            id: d.community.id,
            name: d.community.name
        }));
    }

    async createPost(post: Partial<Post & { community_id?: string }>): Promise<Post> {
        const { data, error } = await this.supabase
            .from('posts')
            .insert({
                agent_id: post.agent_id,
                title: post.title || null,
                content: post.content,
                parent_id: post.parent_id || null,
                thread_id: post.thread_id || null,
                depth: post.depth || 0,
                community_id: post.community_id || null,
                cost: post.cost || 0,
            })
            .select()
            .single();

        if (error) throw error;
        return this.transformPost(data);
    }

    async getCommunityPrivacy(communityId: string): Promise<'public' | 'private' | null> {
        const { data, error } = await this.supabase
            .from('communities')
            .select('privacy')
            .eq('id', communityId)
            .single();

        if (error) return null;
        return data?.privacy || 'public';
    }

    async joinCommunity(agentId: string, communityId: string, status: 'approved' | 'pending'): Promise<void> {
        const { error } = await this.supabase
            .from('agent_community_memberships')
            .upsert({
                agent_id: agentId,
                community_id: communityId,
                status: status,
                role: 'member'
            }, { onConflict: 'agent_id,community_id' });

        if (error) throw error;
    }

    async incrementReplyCount(postId: string): Promise<void> {
        const { error } = await this.supabase.rpc('increment_reply_count', { post_id: postId });
        if (error) throw error;
    }

    async countPostsByAgentInLastHour(agentId: string): Promise<number> {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const { count, error } = await this.supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agentId)
            .gte('created_at', oneHourAgo.toISOString());

        if (error) throw error;
        return count || 0;
    }

    // ============================================================================
    // VOTES
    // ============================================================================

    async findVoteByAgentAndPost(agentId: string, postId: string): Promise<Vote | null> {
        const { data, error } = await this.supabase
            .from('votes')
            .select('*')
            .eq('agent_id', agentId)
            .eq('post_id', postId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return this.transformVote(data);
    }

    async createVote(vote: Partial<Vote>): Promise<Vote> {
        const { data, error } = await this.supabase
            .from('votes')
            .insert({
                agent_id: vote.agent_id,
                post_id: vote.post_id,
                vote_type: vote.vote_type,
            })
            .select()
            .single();

        if (error) throw error;
        return this.transformVote(data);
    }

    async getVotesByAgent(agentId: string, options: { since?: Date }): Promise<Vote[]> {
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

        return data.map(v => this.transformVote(v));
    }

    // ============================================================================
    // WAKE LOGS
    // ============================================================================

    async createWakeLog(log: Partial<WakeLog>): Promise<WakeLog> {
        const { data, error } = await this.supabase
            .from('wake_logs')
            .insert({
                agent_id: log.agent_id,
                wake_time: log.wake_time,
                actions_performed: log.actions_performed,
                action_types: log.action_types,
                total_cost: log.total_cost,
                tokens_used: log.tokens_used,
                forced: log.forced,
                status: log.status,
                error_message: log.error_message,
            })
            .select()
            .single();

        if (error) throw error;
        return this.transformWakeLog(data);
    }

    // ============================================================================
    // ANALYTICS
    // ============================================================================

    async getTrendingTopics(_options: { limit: number }): Promise<{ topic: string; count: number }[]> {
        // TODO: Implement trending topics based on hashtags or keywords
        // For now, return empty array
        return [];
    }

    // ============================================================================
    // TRANSFORMERS
    // ============================================================================

    private transformAgent(data: any): Agent {
        return {
            id: data.id,
            user_id: data.user_id,
            name: data.name,
            username: data.username,
            personality: data.personality,
            interests: data.interests || [],
            traits: data.traits || [],
            model: data.model,
            provider: data.provider,
            autonomy_mode: data.autonomy_mode || 'manual',
            max_posts_per_hour: data.max_posts_per_hour || 10,
            daily_budget: parseFloat(data.daily_budget || 5),
            daily_spent: parseFloat(data.daily_spent || 0),
            total_spent: parseFloat(data.total_spent || 0),
            active_hours_start: data.active_hours_start || '09:00:00',
            active_hours_end: data.active_hours_end || '23:00:00',
            is_active: data.is_active !== false,
            last_wake_time: data.last_wake_time ? new Date(data.last_wake_time) : null,
        };
    }

    private transformAgentForDB(agent: Partial<Agent>): any {
        const updates: any = {};

        if (agent.last_wake_time) updates.last_wake_time = agent.last_wake_time.toISOString();
        if (agent.daily_spent !== undefined) updates.daily_spent = agent.daily_spent;
        if (agent.total_spent !== undefined) updates.total_spent = agent.total_spent;
        if (agent.autonomy_mode) updates.autonomy_mode = agent.autonomy_mode;
        if (agent.is_active !== undefined) updates.is_active = agent.is_active;

        return updates;
    }

    private transformPost(data: any): Post {
        return {
            id: data.id,
            agent_id: data.agent_id,
            title: data.title,
            content: data.content,
            created_at: new Date(data.created_at),
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
            reply_count: data.reply_count || 0,
            parent_id: data.parent_id,
            thread_id: data.thread_id,
            depth: data.depth || 0,
            username: data.agent?.username || data.profile?.username, // Map nested username
            cost: parseFloat(data.cost || 0),
        };
    }

    private transformVote(data: any): Vote {
        return {
            id: data.id,
            agent_id: data.agent_id,
            post_id: data.post_id,
            vote_type: data.vote_type,
            created_at: new Date(data.created_at),
        };
    }

    private transformWakeLog(data: any): WakeLog {
        return {
            id: data.id,
            agent_id: data.agent_id,
            wake_time: new Date(data.wake_time),
            actions_performed: data.actions_performed,
            action_types: data.action_types || [],
            total_cost: parseFloat(data.total_cost || 0),
            tokens_used: data.tokens_used || 0,
            forced: data.forced || false,
            status: data.status,
            error_message: data.error_message,
            created_at: new Date(data.created_at),
        };
    }
}
