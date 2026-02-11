/**
 * Rate limiter for autonomous agent actions
 * Prevents agents from spamming by enforcing hourly limits
 */

interface RateLimitConfig {
    posts: number;
    replies: number;
    votes: number;
}

interface RateLimitState {
    posts: number[];
    replies: number[];
    votes: number[];
}

export class RateLimiter {
    private limits: RateLimitConfig;
    private state: Map<string, RateLimitState>;

    constructor() {
        this.limits = {
            posts: 10,      // Max 10 posts per hour
            replies: 20,    // Max 20 replies per hour
            votes: 50,      // Max 50 votes per hour
        };

        this.state = new Map();
    }

    /**
     * Check if agent can perform an action
     */
    async canPerformAction(
        agentId: string,
        actionType: 'post' | 'reply' | 'upvote' | 'downvote'
    ): Promise<boolean> {
        const state = this.getOrCreateState(agentId);
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);

        // Clean up old timestamps
        this.cleanOldTimestamps(state, oneHourAgo);

        // Check limit based on action type
        let currentCount: number;
        let limit: number;

        if (actionType === 'post') {
            currentCount = state.posts.length;
            limit = this.limits.posts;
        } else if (actionType === 'reply') {
            currentCount = state.replies.length;
            limit = this.limits.replies;
        } else {
            // upvote or downvote
            currentCount = state.votes.length;
            limit = this.limits.votes;
        }

        return currentCount < limit;
    }

    /**
     * Record an action
     */
    async recordAction(
        agentId: string,
        actionType: 'post' | 'reply' | 'upvote' | 'downvote'
    ): Promise<void> {
        const state = this.getOrCreateState(agentId);
        const now = Date.now();

        if (actionType === 'post') {
            state.posts.push(now);
        } else if (actionType === 'reply') {
            state.replies.push(now);
        } else {
            state.votes.push(now);
        }
    }

    /**
     * Get current usage for an agent
     */
    async getUsage(agentId: string): Promise<{
        posts: number;
        replies: number;
        votes: number;
    }> {
        const state = this.getOrCreateState(agentId);
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);

        this.cleanOldTimestamps(state, oneHourAgo);

        return {
            posts: state.posts.length,
            replies: state.replies.length,
            votes: state.votes.length,
        };
    }

    /**
     * Reset limits for an agent
     */
    async reset(agentId: string): Promise<void> {
        this.state.delete(agentId);
    }

    /**
     * Set custom limits
     */
    setLimits(limits: Partial<RateLimitConfig>): void {
        this.limits = { ...this.limits, ...limits };
    }

    /**
     * Get or create state for an agent
     */
    private getOrCreateState(agentId: string): RateLimitState {
        if (!this.state.has(agentId)) {
            this.state.set(agentId, {
                posts: [],
                replies: [],
                votes: [],
            });
        }
        return this.state.get(agentId)!;
    }

    /**
     * Clean up timestamps older than one hour
     */
    private cleanOldTimestamps(state: RateLimitState, oneHourAgo: number): void {
        state.posts = state.posts.filter(ts => ts > oneHourAgo);
        state.replies = state.replies.filter(ts => ts > oneHourAgo);
        state.votes = state.votes.filter(ts => ts > oneHourAgo);
    }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();
