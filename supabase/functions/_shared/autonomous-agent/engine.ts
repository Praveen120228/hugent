/**
 * Autonomous Agent Engine - Core wake cycle logic
 * Handles multi-action decision making and execution
 */

import type {
    Agent,
    AgentAction,
    AgentContext,
    WakeCycleResult,
    DecisionResult,
    ActionResult,
    BudgetCheckResult,
    UnreadReplies,
    AgentIntent,
} from './types.ts';
import { DatabaseAdapter } from './database-adapter.ts';
import { contentFilter } from './content-filter.ts';
import { LLMService } from './llm-service.ts';
import { cryptoUtils } from './crypto-utils.ts';

export class AutonomousAgentEngine {
    private db: DatabaseAdapter;
    private llm: LLMService;
    private encryptionKey?: string;

    constructor(supabaseUrl?: string, supabaseKey?: string, encryptionKey?: string) {
        this.db = new DatabaseAdapter(supabaseUrl, supabaseKey);
        this.llm = new LLMService();
        this.encryptionKey = encryptionKey;
    }

    /**
     * Main wake cycle - called every 15 minutes by cron or on manual trigger
     */
    async wakeAgent(agentId: string, forcedWake: boolean = false, intent?: AgentIntent): Promise<WakeCycleResult> {
        const startTime = new Date();
        const actionsPerformed: AgentAction[] = [];
        let totalCost = 0;
        let tokensUsed = 0;

        try {
            // 1. LOAD AGENT & VALIDATE
            const agent = await this.db.findAgentById(agentId);

            if (!agent) {
                throw new Error(`Agent ${agentId} not found`);
            }

            // Check if agent should be active
            const canWake = forcedWake || this.shouldAgentWake(agent);
            if (!canWake) {
                return {
                    agentId,
                    wakeTime: startTime,
                    actionsPerformed: [],
                    totalCost: 0,
                    tokensUsed: 0,
                    nextWakeTime: this.calculateNextWakeTime(agent),
                    status: 'success'
                };
            }

            // 2. CHECK BUDGET & RATE LIMITS
            const budgetCheck = await this.checkBudgetAndLimits(agent);
            if (!budgetCheck.canProceed) {
                // For forced wake, we still check budget but maybe more leniently?
                // For now keep it strict.
                return {
                    agentId,
                    wakeTime: startTime,
                    actionsPerformed: [],
                    totalCost: 0,
                    tokensUsed: 0,
                    nextWakeTime: this.calculateNextWakeTime(agent),
                    status: budgetCheck.reason === 'budget' ? 'budget_exceeded' : 'rate_limited',
                    errorMessage: budgetCheck.message
                };
            }

            // 3. GATHER CONTEXT (Including history and new replies)
            const context = await this.gatherContext(agent, intent);

            // 4. DECIDED ACTIONS (Follows Priorities 1-4)
            const decisions = await this.decideActions(agent, context, intent);

            // Track cost of decision-making
            totalCost += decisions.cost;
            tokensUsed += decisions.tokensUsed;

            // 5. EXECUTE ACTIONS
            const actionTypesPerformed: string[] = [];

            // Priority: Replies first
            const replyActions = decisions.actions.filter((a: AgentAction) => a.type === 'reply');
            const voteActions = decisions.actions.filter((a: AgentAction) => a.type === 'upvote' || a.type === 'downvote');
            const postActions = decisions.actions.filter((a: AgentAction) => a.type === 'post');

            const allActionsToExecute = [...replyActions, ...voteActions, ...postActions];

            for (const action of allActionsToExecute) {
                // Check daily budget
                const remainingBudget = agent.daily_budget - (agent.daily_spent + totalCost);
                if (remainingBudget <= 0) {
                    console.log(`Agent ${agent.id} budget limit reached. Stopping actions.`);
                    break;
                }

                // Execute the action
                console.log(`Executing ${action.type} action for ${agent.name}...`);
                const result = await this.executeAction(agent, action);

                if (result.success) {
                    actionsPerformed.push(action);
                    totalCost += result.cost;
                    tokensUsed += result.tokensUsed;
                    actionTypesPerformed.push(action.type);
                } else {
                    console.warn(`Action ${action.type} failed for ${agent.name}`);
                }
            }

            // Priority 5: Record which posts were checked for replies
            if (context.unreadRepliesByPost.length > 0) {
                const checkedPostIds = context.unreadRepliesByPost.map((ur: UnreadReplies) => ur.postId);
                await this.db.markPostsAsChecked(agent.id, checkedPostIds);
            }

            // 6. UPDATE AGENT STATE
            await this.updateAgentState(agent, totalCost);

            // 7. LOG WAKE CYCLE
            await this.db.createWakeLog({
                agent_id: agent.id,
                wake_time: startTime,
                actions_performed: actionsPerformed.length,
                action_types: actionsPerformed.map((a: AgentAction) => a.type),
                total_cost: totalCost,
                tokens_used: tokensUsed,
                forced: forcedWake,
                status: 'success',
                error_message: null,
                created_at: new Date(),
            } as any);

            return {
                agentId,
                wakeTime: startTime,
                actionsPerformed,
                totalCost,
                tokensUsed,
                nextWakeTime: this.calculateNextWakeTime(agent),
                status: 'success',
                thoughtProcess: decisions.thoughtProcess
            };

        } catch (error: any) {
            console.error(`Error in wake cycle for agent ${agentId}:`, error);

            // Log error
            try {
                await this.db.createWakeLog({
                    agent_id: agentId,
                    wake_time: startTime,
                    actions_performed: 0,
                    action_types: [],
                    total_cost: totalCost,
                    tokens_used: tokensUsed,
                    forced: forcedWake,
                    status: 'error',
                    error_message: error.message,
                    created_at: new Date(),
                } as any);
            } catch (logError) {
                console.error('Failed to log wake cycle error to database:', logError);
            }

            return {
                agentId,
                wakeTime: startTime,
                actionsPerformed,
                totalCost,
                tokensUsed,
                nextWakeTime: this.calculateNextWakeTime(null),
                status: 'error',
                errorMessage: error.message
            };
        }
    }

    /**
     * Use the LLM to decide what actions to take this wake cycle
     * This is a SINGLE LLM call that returns multiple actions
     */
    private async decideActions(
        agent: Agent,
        context: AgentContext,
        intent?: AgentIntent
    ): Promise<DecisionResult> {
        const startTime = Date.now();

        // Check if we have a forced action (intent) that already has content
        if (intent && (intent.content || intent.type === 'join_community' || intent.type === 'upvote' || intent.type === 'downvote')) {
            console.log(`Force-injecting completed intent: ${intent.type} for agent ${agent.name}`);
            const forcedAction: AgentAction = {
                type: intent.type as any,
                postId: intent.targetPostId,
                communityId: intent.communityId,
                content: intent.content,
                reasoning: `Directive from owner: ${intent.type}`
            };

            return {
                actions: [forcedAction],
                cost: 0,
                tokensUsed: 0,
                latency: 0,
                rawResponse: 'Forced action via intent',
                thoughtProcess: `Executing user-directed intent: ${intent.type}`
            };
        }

        // 1. Get API Key
        const keyRecord = await this.db.getAgentApiKey(agent.id);
        if (!keyRecord) {
            throw new Error(`No API key found for agent ${agent.name}`);
        }

        // 2. Decrypt
        // @ts-ignore
        const masterKey = this.encryptionKey || (import.meta as any).env?.VITE_ENCRYPTION_KEY || (typeof process !== 'undefined' ? process.env?.ENCRYPTION_KEY : null) || (import.meta as any).env?.ENCRYPTION_KEY;
        if (!masterKey) {
            console.error('CRITICAL: ENCRYPTION_KEY not found in any environment source');
            throw new Error('ENCRYPTION_KEY not configured');
        }

        console.log(`Decrypting key for provider: ${keyRecord.provider}, masterKey length: ${masterKey?.length}`);
        const apiKey = cryptoUtils.decrypt(keyRecord.encryptedKey, masterKey);
        console.log(`Decryption successful. Key starts with: ${apiKey.substring(0, 8)}...`);

        // 3. Build Prompt
        const prompt = this.buildDecisionPrompt(agent, context, intent);

        // 4. Call LLM
        const response = await this.llm.call({
            model: agent.model,
            messages: [
                { role: 'system', content: `You are ${agent.name}. Decision-making mode.` },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7
        }, apiKey, keyRecord.provider);

        // 5. Parse
        let actions: AgentAction[] = [];
        let thoughtProcess = '';
        try {
            // Remove markdown code blocks if present
            let cleanResponse = response.content.trim();
            if (cleanResponse.startsWith('```json')) {
                cleanResponse = cleanResponse.substring(7, cleanResponse.length - 3).trim();
            } else if (cleanResponse.startsWith('```')) {
                cleanResponse = cleanResponse.substring(3, cleanResponse.length - 3).trim();
            }

            const parsed = JSON.parse(cleanResponse);
            const rawActions = parsed.actions || [];
            thoughtProcess = parsed.thought_process || '';

            // 6. Map target IDs to postIds
            for (const action of rawActions) {
                if (action.target) {
                    const target = action.target;
                    if (target.startsWith('R_')) {
                        // Map R_i_j -> reply ID
                        const parts = target.split('_');
                        const postIdx = parseInt(parts[1]);
                        const replyIdx = parseInt(parts[2]);
                        const reply = context.unreadRepliesByPost[postIdx]?.replies[replyIdx];
                        if (reply) {
                            action.postId = reply.id;
                            actions.push(action);
                        }
                    } else if (target.startsWith('F')) {
                        // Map Fi -> feed post ID
                        const postIdx = parseInt(target.substring(1));
                        const post = context.recentPosts[postIdx];
                        if (post) {
                            action.postId = post.id;
                            actions.push(action);
                        }
                    } else if (target.startsWith('CP')) {
                        // Map CPi -> community post ID
                        const postIdx = parseInt(target.substring(2));
                        const post = context.communityPosts[postIdx];
                        if (post) {
                            action.postId = post.id;
                            actions.push(action);
                        }
                    } else if (target === 'DIRECTIVE_TARGET' && intent?.targetPostId) {
                        // Map DIRECTIVE_TARGET to the intent target
                        action.postId = intent.targetPostId;
                        actions.push(action);
                    }
                } else if (action.type === 'post') {
                    // Posts can optionally target a community
                    // If communityId is C_id, strip the C_
                    if (action.communityId?.startsWith('C_')) {
                        action.communityId = action.communityId.substring(2);
                    }
                    actions.push(action);
                }
            }

            // 7. Enforce single action IF there was an intent
            if (intent) {
                // If the LLM returned actions, make sure the first one matches the directive
                if (actions.length > 0) {
                    const firstAction = actions[0];

                    // Coerce to match intent if there's a type or target mismatch
                    if (firstAction.type !== intent.type) {
                        console.log(`Coerced action type from ${firstAction.type} to ${intent.type} to match directive.`);
                        firstAction.type = intent.type as any;
                    }

                    // Ensure target is correct for replies
                    if (intent.type === 'reply' && firstAction.postId !== intent.targetPostId) {
                        console.log(`Coerced target postId for reply to match directive.`);
                        firstAction.postId = intent.targetPostId;
                    }

                    console.log(`Strictly enforcing mandatory directive. Discarding ${actions.length - 1} auxiliary actions.`);
                    actions = [firstAction];
                }
            }
        } catch (e) {
            console.error('Failed to parse agent actions JSON. Error:', e);
            console.error('Raw response content:', response.content);
        }

        console.log(`LLM decided on ${actions.length} actions for ${agent.name}. Thought process: ${thoughtProcess}`);

        // Estimate cost based on usage (simplified)
        const cost = (response.usage.total_tokens / 1000000) * 5; // Rough estimate $5/M tokens

        return {
            actions,
            cost,
            tokensUsed: response.usage.total_tokens,
            latency: Date.now() - startTime,
            rawResponse: response.content,
            thoughtProcess
        };
    }

    /**
     * Build the decision prompt - this is crucial for good agent behavior
     */
    private buildDecisionPrompt(agent: Agent, context: AgentContext, intent?: AgentIntent): string {
        const canPostNew = context.dailyPostCount < 50;

        let prompt = `You are ${agent.name} (@${agent.username}), an AI agent on the Hugents social network.

PERSONALITY:
${agent.personality}

YOUR TRAITS: ${agent.traits.join(', ')}
YOUR INTERESTS: ${agent.interests.join(', ')}

${intent ? `USER DIRECTIVE (MANDATORY):
You have been woken up with a specific directive. You MUST perform this action:
TYPE: ${intent.type}
${intent.targetPostId ? `TARGET POST [DIRECTIVE_TARGET]: "${context.targetPostForIntent?.content}" by @${context.targetPostForIntent?.username}` : ''}
${intent.communityId ? `COMMUNITY: ${intent.communityId}` : ''}

Your response MUST include a "${intent.type}" action with "target": "DIRECTIVE_TARGET".
DO NOT create a new top-level "post" to tell the user you are replying; use the "reply" action type so it threads correctly.
` : ''}

CURRENT CONTEXT:
- Time: ${new Date().toLocaleString()}
- Daily stats: ${context.dailyPostCount}/50 new posts today.
- Active conversations: ${context.unreadRepliesByPost.length} of your posts have new replies.

PRIORITY 1 & 2: REPLIES TO YOUR POSTS
You must review new replies to your previous posts. Choose the ONE most engaging comment to respond to across ALL your posts.
${context.unreadRepliesByPost.length === 0
                ? "You have no new replies to your posts."
                : context.unreadRepliesByPost.map((ur: UnreadReplies, i: number) =>
                    `--- Your Post [P${i}]: "${ur.originalContent}" ---
New Replies to P${i}:
${ur.replies.map((r: any, j: number) => `  [R_${i}_${j}] @${r.username}: "${r.content}"`).join('\n')}`
                ).join('\n\n')
            }

PRIORITY 3: VOTING
Review the replies and the network feed above. You should upvote/downvote posts or comments that align/conflict with your personality.

PRIORITY 4: NEW CONTENT
${canPostNew
                ? "You can create a new post if you have something interesting to say. You can post to the network (Portal) or one of your followed communities."
                : "You have reached your limit of 50 new posts for today. Do NOT propose a new top-level post."
            }

FOLLOWED COMMUNITIES:
${context.followedCommunities.length === 0 ? "You do not follow any communities." : context.followedCommunities.map((c: any) => `[C_${c.id}] c/${c.name}`).join('\n')}

RECENT NETWORK FEED:
${context.recentPosts.length === 0 ? "The network feed is currently empty." : context.recentPosts.map((post: any, i: number) =>
                `[F${i}] @${post.username}: "${post.content}"`
            ).join('\n')
            }

RECENT COMMUNITY POSTS (from your followed communities):
${context.communityPosts.length === 0 ? "No recent posts in your followed communities." : context.communityPosts.map((post: any, i: number) =>
                `[CP${i}] (c/${post.communityName}) @${post.username}: "${post.content}"`
            ).join('\n')
            }

YOUR TASK:
Decide on your actions. Format as JSON:
{
    "actions": [
        {
            "type": "reply",
            "target": "R_0_1", // Use the reference ID
            "content": "Your reply...",
            "reasoning": "Why this reply is the most engaging"
        },
        {
            "type": "upvote",
            "target": "R_0_2",
            "reasoning": "Strong point"
        },
        {
            "type": "upvote",
            "target": "F1",
            "reasoning": "This post aligns with my interests"
        },
        {
            "type": "post",
            "title": "A compelling subject line",
            "communityId": "C_COMMUNITY_ID_HERE", // Optional: Use the C_ ID from FOLLOWED COMMUNITIES to post there
            "content": "A new original post...",
            "reasoning": "Why this post is interesting and aligns with my personality"
        }
    ],
    "thought_process": "Explain your logic..."
}

CRITICAL RULES:
1. Every new "post" MUST have a "title" (subject line). Replies do NOT need a title.
2. ${intent ? `MANDATORY DIRECTIVE: You have been assigned a specific task. Your ONLY action in the array MUST be of type "${intent.type}" ${intent.targetPostId ? `targeting the post by @${context.targetPostForIntent?.username || 'the user'}` : ''}. Your action MUST use "target": "DIRECTIVE_TARGET". Do NOT include any other actions. ONLY return the directed "${intent.type}" action.` : 'Follow your personality and priorities.'}
3. Do NOT ever end your post content with "..." unless it is part of the actual intended text.
`;
        return prompt;
    }

    /**
     * Execute a single action decided by the agent
     */
    private async executeAction(
        agent: Agent,
        action: AgentAction
    ): Promise<ActionResult> {

        switch (action.type) {
            case 'post':
                return await this.executePost(agent, action);

            case 'reply':
                return await this.executeReply(agent, action);

            case 'upvote':
                return await this.executeVote(agent, action, 'up');

            case 'downvote':
                return await this.executeVote(agent, action, 'down');

            case 'join_community':
                return await this.executeJoinCommunity(agent, action);

            case 'skip':
                return { success: true, cost: 0, tokensUsed: 0 };

            default:
                console.warn(`Unknown action type: ${action.type} `);
                return { success: false, cost: 0, tokensUsed: 0 };
        }
    }

    /**
     * Create and publish an original post
     */
    private async executePost(agent: Agent, action: AgentAction): Promise<ActionResult> {
        if (!action.content) {
            return { success: false, cost: 0, tokensUsed: 0 };
        }

        // Safety check
        const safetyCheck = await contentFilter.check(action.content);
        if (!safetyCheck.safe) {
            console.warn(`Post blocked by content filter: ${safetyCheck.reason} `);
            return { success: false, cost: 0, tokensUsed: 0 };
        }

        // Create post in database
        const post = await this.db.createPost({
            agent_id: agent.id,
            title: action.title,
            content: action.content,
            community_id: action.communityId?.startsWith('C_') ? action.communityId.substring(2) : action.communityId,
            created_at: new Date(),
            cost: 0.001,
        } as any);

        console.log(`✅ Agent ${agent.name} posted: ${action.title ? `[${action.title}] ` : ''}"${action.content.substring(0, 100)}${action.content.length > 100 ? '...' : ''}"`);

        return {
            success: true,
            cost: 0.001,
            tokensUsed: 0,
            postId: post.id
        };
    }

    /**
     * Join a community
     */
    private async executeJoinCommunity(agent: Agent, action: AgentAction): Promise<ActionResult> {
        if (!action.communityId) {
            return { success: false, cost: 0, tokensUsed: 0 };
        }

        try {
            // Check community privacy
            const privacy = await this.db.getCommunityPrivacy(action.communityId);
            const status = privacy === 'public' ? 'approved' : 'pending';

            await this.db.joinCommunity(agent.id, action.communityId, status);

            console.log(`Agent ${agent.name} ${status === 'approved' ? 'joined' : 'requested to join'} community ${action.communityId} `);
            return { success: true, cost: 0, tokensUsed: 0 };
        } catch (e) {
            console.error('Failed to join community:', e);
            return { success: false, cost: 0, tokensUsed: 0 };
        }
    }

    /**
     * Reply to another post
     */
    private async executeReply(agent: Agent, action: AgentAction): Promise<ActionResult> {
        if (!action.content || !action.postId) {
            return { success: false, cost: 0, tokensUsed: 0 };
        }

        // Safety check
        const safetyCheck = await contentFilter.check(action.content);
        if (!safetyCheck.safe) {
            console.warn(`Reply blocked by content filter: ${safetyCheck.reason} `);
            return { success: false, cost: 0, tokensUsed: 0 };
        }

        // Fetch parent post to get threading info
        const parentPost = await this.db.findPostById(action.postId);
        if (!parentPost) {
            console.error(`Parent post ${action.postId} not found for reply`);
            return { success: false, cost: 0, tokensUsed: 0 };
        }

        const threadId = parentPost.thread_id || parentPost.id;
        const depth = (parentPost.depth || 0) + 1;

        // Create reply
        const reply = await this.db.createPost({
            agent_id: agent.id,
            content: action.content,
            parent_id: action.postId,
            thread_id: threadId,
            depth: depth,
            created_at: new Date(),
            cost: 0.001,
        } as any);

        // Update parent post reply count
        await this.db.incrementReplyCount(action.postId);

        console.log(`✅ Agent ${agent.name} replied to post ${action.postId} `);

        return {
            success: true,
            cost: 0.001,
            tokensUsed: 0,
            postId: reply.id
        };
    }

    /**
     * Upvote or downvote a post
     */
    private async executeVote(
        agent: Agent,
        action: AgentAction,
        voteType: 'up' | 'down'
    ): Promise<ActionResult> {
        if (!action.postId) {
            return { success: false, cost: 0, tokensUsed: 0 };
        }

        // Check if already voted
        const existingVote = await this.db.findVoteByAgentAndPost(agent.id, action.postId);
        if (existingVote) {
            console.log(`Agent ${agent.name} already voted on post ${action.postId} `);
            return { success: false, cost: 0, tokensUsed: 0 };
        }

        // Record vote using the unified vote_type system
        await this.db.createVote({
            agent_id: agent.id,
            post_id: action.postId,
            vote_type: voteType,
            created_at: new Date(),
        } as any);

        console.log(`✅ Agent ${agent.name} ${voteType}voted post ${action.postId} `);

        return {
            success: true,
            cost: 0, // Voting is free!
            tokensUsed: 0
        };
    }

    /**
     * Gather all the context the agent needs to make decisions
     */
    private async gatherContext(agent: Agent, intent?: AgentIntent): Promise<AgentContext> {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1. Get recent posts from network (Priority 4)
        const recentPosts = await this.db.getRecentPosts({
            limit: 20,
            since: oneDayAgo,
            excludeAgentId: agent.id
        });

        // 2. Get unread replies for priority check (Priority 1)
        const postsToReview = await this.db.findPostsToReview(agent.id);
        const unreadRepliesByPost: UnreadReplies[] = [];

        for (const post of postsToReview) {
            const replies = await this.db.getNewRepliesForPost(post.id, post.lastCheckedAt);
            if (replies.length > 0) {
                // Get original post info
                const originalPost = await this.db.findPostById(post.id);
                unreadRepliesByPost.push({
                    postId: post.id,
                    originalContent: originalPost?.content || '',
                    replies: replies
                });
            }
        }

        // 3. Daily post count (Priority 4 safeguard)
        const dailyPostCount = await this.db.getDailyNewPostCount(agent.id);

        // EXTRA: Target post for intent if specified
        let targetPostForIntent = null;
        if (intent?.targetPostId) {
            const post = await this.db.findPostById(intent.targetPostId);
            if (post) {
                targetPostForIntent = {
                    id: post.id,
                    content: post.content,
                    username: post.username || 'unknown'
                };
            }
        }
        // 4. Direct mentions (older logic, kept as backup)
        const mentionsAndReplies = await this.db.getMentionsAndReplies(agent.id, {
            limit: 5
        });

        // 5. Agent's last post time
        const lastPost = await this.db.getLastPostByAgent(agent.id);
        const timeSinceLastPost = lastPost
            ? this.formatTimeSince(lastPost.created_at)
            : 'never';

        // 6. Trending topics
        const trendingTopicsData = await this.db.getTrendingTopics({ limit: 5 });

        // 7. Recent votes
        const recentVotes = await this.db.getVotesByAgent(agent.id, {
            since: oneDayAgo
        });

        // 8. Followed communities and their posts
        const followedCommunities = await this.db.getAgentFollowedCommunities(agent.id);
        const communityIds = followedCommunities.map((c: any) => c.id);
        const communityPosts = await this.db.getRecentCommunityPosts(communityIds, {
            limit: 10,
            since: oneDayAgo
        });

        return {
            recentPosts,
            unreadRepliesByPost,
            mentionsAndReplies,
            timeSinceLastPost,
            trendingTopics: (trendingTopicsData as any[]).map((t: any) => t.topic),
            recentVotes: (recentVotes as any[]).map((v: any) => v.post_id),
            dailyPostCount,
            followedCommunities,
            communityPosts,
            targetPostForIntent
        };
    }

    /**
     * Check if agent should wake up this cycle
     */
    private shouldAgentWake(agent: Agent): boolean {
        // Check if agent is active
        if (!agent.is_active) return false;

        const now = new Date();

        // Check last wake time (min 5 minutes cooldown)
        if (agent.last_wake_time) {
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            if (agent.last_wake_time > fiveMinutesAgo) {
                console.log(`Agent ${agent.name} woke too recently. Skipping.`);
                return false;
            }
        }

        // Check autonomy mode
        if (agent.autonomy_mode === 'manual') return false;

        // Check active hours
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinutes;

        const [startHour, startMinutes] = agent.active_hours_start.split(':').map(Number);
        const [endHour, endMinutes] = agent.active_hours_end.split(':').map(Number);
        const startTime = startHour * 60 + startMinutes;
        const endTime = endHour * 60 + endMinutes;

        if (currentTime < startTime || currentTime > endTime) {
            return false;
        }

        return true;
    }

    /**
     * Check budget and rate limits before proceeding
     */
    private async checkBudgetAndLimits(agent: Agent): Promise<BudgetCheckResult> {
        // Check daily budget
        if (agent.daily_spent >= agent.daily_budget) {
            return {
                canProceed: false,
                reason: 'budget',
                message: `Daily budget of $${agent.daily_budget} exceeded`
            };
        }

        // Check hourly post limit
        const hourlyPosts = await this.db.countPostsByAgentInLastHour(agent.id);
        if (hourlyPosts >= agent.max_posts_per_hour) {
            return {
                canProceed: false,
                reason: 'rate_limit',
                message: `Hourly post limit of ${agent.max_posts_per_hour} reached`
            };
        }

        return { canProceed: true };
    }

    /**
     * Update agent state after wake cycle
     */
    private async updateAgentState(
        agent: Agent,
        costIncurred: number
    ): Promise<void> {
        await this.db.updateAgent(agent.id, {
            last_wake_time: new Date(),
            daily_spent: agent.daily_spent + costIncurred,
            total_spent: agent.total_spent + costIncurred,
        } as any);
    }

    /**
     * Calculate next wake time based on agent settings
     */
    private calculateNextWakeTime(agent: Agent | null): Date | null {
        const now = new Date();

        if (!agent || agent.autonomy_mode === 'manual') {
            return null; // Manual mode - no automatic wake
        }

        if (agent.autonomy_mode === 'scheduled') {
            // Wake every 15 minutes
            return new Date(now.getTime() + 15 * 60 * 1000);
        }

        if (agent.autonomy_mode === 'full') {
            // Wake every 5 minutes for real-time feel
            return new Date(now.getTime() + 5 * 60 * 1000);
        }

        return new Date(now.getTime() + 15 * 60 * 1000);
    }

    /**
     * Format time since last action
     */
    private formatTimeSince(date: Date): string {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }
}
