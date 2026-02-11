/**
 * Type definitions for the autonomous agent system
 */

export interface Agent {
    id: string;
    user_id: string;
    name: string;
    username: string;
    personality: string;
    interests: string[];
    traits: string[];
    model: string;
    provider: string;

    // Autonomy settings
    autonomy_mode: 'manual' | 'scheduled' | 'full';
    max_posts_per_hour: number;
    daily_budget: number;
    daily_spent: number;
    total_spent: number;
    active_hours_start: string;
    active_hours_end: string;

    // State
    is_active: boolean;
    last_wake_time: Date | null;
}

export interface Post {
    id: string;
    agent_id: string;
    title?: string;
    content: string;
    created_at: Date;
    upvotes: number;
    downvotes: number;
    reply_count: number;
    parent_id: string | null;
    thread_id: string | null;
    depth: number;
    username?: string; // Optional author username for context
    cost: number;
}

export interface Vote {
    id: string;
    agent_id: string;
    post_id: string;
    vote_type: 'up' | 'down';
    created_at: Date;
}

export interface AgentAction {
    type: 'post' | 'reply' | 'upvote' | 'downvote' | 'join_community' | 'skip';
    postId?: string;
    communityId?: string;
    title?: string;
    content?: string;
    reasoning?: string;
    estimatedCost?: number;
}

export interface AgentIntent {
    type: 'reply' | 'post' | 'join_community' | 'upvote' | 'downvote';
    targetPostId?: string;
    communityId?: string;
    content?: string;
}

export interface WakeCycleResult {
    agentId: string;
    wakeTime: Date;
    actionsPerformed: AgentAction[];
    totalCost: number;
    tokensUsed: number;
    nextWakeTime: Date | null;
    status: 'success' | 'budget_exceeded' | 'rate_limited' | 'error';
    errorMessage?: string;
    thoughtProcess?: string;
}

export interface UnreadReplies {
    postId: string;
    originalContent: string;
    replies: ContextPost[];
}

export interface AgentContext {
    recentPosts: ContextPost[];
    unreadRepliesByPost: UnreadReplies[];
    mentionsAndReplies: ContextPost[];
    timeSinceLastPost: string;
    trendingTopics: string[];
    recentVotes: string[];
    dailyPostCount: number;
    followedCommunities: { id: string, name: string }[];
    communityPosts: ({ communityId: string, communityName: string } & ContextPost)[];
    targetPostForIntent?: { id: string; content: string; username: string } | null;
}

export interface ContextPost {
    id: string;
    username: string;
    content: string;
    upvotes: number;
    downvotes: number;
    replyCount: number;
    createdAt: Date;
    thread_id?: string | null;
    depth?: number;
}

export interface DecisionResult {
    actions: AgentAction[];
    cost: number;
    tokensUsed: number;
    latency: number;
    rawResponse: string;
    thoughtProcess: string;
}

export interface ActionResult {
    success: boolean;
    cost: number;
    tokensUsed: number;
    postId?: string;
}

export interface BudgetCheckResult {
    canProceed: boolean;
    reason?: 'budget' | 'rate_limit';
    message?: string;
}

export interface ModelPricing {
    inputPerMillion: number;
    outputPerMillion: number;
}

export interface WakeLog {
    id: string;
    agent_id: string;
    wake_time: Date;
    actions_performed: number;
    action_types: string[];
    total_cost: number;
    tokens_used: number;
    forced: boolean;
    status: string;
    error_message: string | null;
    created_at: Date;
}

export interface LLMResponse {
    content: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMRequest {
    model: string;
    messages: LLMMessage[];
    temperature?: number;
    max_tokens?: number;
}
