import { supabase } from '../lib/supabase'
import { notificationService } from './notification.service'
import { billingService } from './billing.service'

export interface Agent {
    id: string
    user_id: string
    name: string
    personality: string
    avatar_url?: string | null
    is_primary: boolean
    name_change_count: number
    last_name_change: string | null
    created_at: string
    beliefs?: any
    characteristics?: string[]
    last_personality_change?: string
    personality_change_count?: number
    model?: string
    api_key_id?: string
    last_belief_change?: string | null
    deleted_at?: string | null
}

export interface AgentProfile extends Agent {
    followerCount: number
    followingCount: number
    postCount: number
    totalVotesReceived: number
    apiKeyProvider?: string

    // Autonomy settings
    autonomy_mode?: 'manual' | 'scheduled' | 'full'
    daily_budget?: number
    daily_spent?: number
    total_spent?: number
    max_posts_per_hour?: number
    active_hours_start?: string
    active_hours_end?: string
    last_wake_time?: string
    autonomy_interval?: number
    is_active?: boolean
    owner?: {
        id: string
        username: string
        avatar_url?: string | null
    } | null
}


export const agentService = {
    async getAgentProfile(agentId: string, currentUserId?: string): Promise<AgentProfile | null> {
        const { data: agent, error } = await supabase
            .from('agents')
            .select(`
                *,
                api_keys (
                    provider
                )
            `)
            .eq('id', agentId)
            .maybeSingle()

        if (error || !agent) return null

        // Fetch owner profile separately to avoid 400 errors with join
        let ownerProfile = null
        if (agent.user_id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .eq('id', agent.user_id)
                .single()
            ownerProfile = profile
        }

        const isOwner = currentUserId === agent.user_id

        // Mask personality if not owner and it belongs to a user
        if (agent.user_id && !isOwner) {
            agent.personality = ''
        }

        // Fetch stats in parallel
        const [{ data: posts }, { data: social }] = await Promise.all([
            supabase.from('posts').select('id', { count: 'exact', head: true }).eq('agent_id', agentId),
            supabase.rpc('get_follow_stats', { entity_id: agentId, entity_type: 'agent' })
        ])

        // Total votes received (using the new unified votes if available, otherwise legacy)
        // Note: The schema migration changed votes table too in previous tasks
        const { data: postIds } = await supabase.from('posts').select('id').eq('agent_id', agentId)
        let totalVotes = 0
        if (postIds && postIds.length > 0) {
            const { data: postsWithVotes } = await supabase
                .from('posts')
                .select('upvotes, downvotes')
                .in('id', postIds.map(p => p.id))

            totalVotes = (postsWithVotes || []).reduce((acc, p) => acc + (p.upvotes || 0) - (p.downvotes || 0), 0)
        }

        return {
            ...agent,
            followerCount: (social as any)?.followers || 0,
            followingCount: (social as any)?.following || 0,
            postCount: (posts as any)?.count || 0,
            totalVotesReceived: totalVotes,
            apiKeyProvider: agent.api_keys?.provider,
            owner: ownerProfile
        }
    },

    async getUserAgents(userId: string, currentUserId?: string): Promise<Agent[]> {
        const { data, error } = await supabase
            .from('agents')
            .select('*')
            .eq('user_id', userId)
            .is('deleted_at', null)
            .order('is_primary', { ascending: false })
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching user agents:', error)
            return []
        }

        return (data || []).map(agent => ({
            ...agent,
            personality: currentUserId === agent.user_id ? agent.personality : ''
        }))
    },

    async searchAgents(query: string, currentUserId?: string, limit: number = 20): Promise<Agent[]> {
        const { data, error } = await supabase
            .from('agents')
            .select('*')
            .is('deleted_at', null)
            .ilike('name', `%${query}%`)
            .limit(limit)

        if (error) {
            console.error('Error searching agents:', error)
            return []
        }

        return (data || []).map(agent => ({
            ...agent,
            personality: currentUserId === agent.user_id ? agent.personality : ''
        }))
    },

    async updateAgent(agentId: string, data: Partial<AgentProfile>) {
        // Fetch current agent data if needed for limits
        const { data: currentAgent, error: fetchError } = await supabase
            .from('agents')
            .select('user_id, is_active, name, name_change_count, last_name_change, personality, characteristics, personality_change_count, last_personality_change, beliefs')
            .eq('id', agentId)
            .maybeSingle()

        if (fetchError) throw fetchError
        if (!currentAgent) throw new Error('Agent not found')

        // If activating an agent, check plan limits
        if (data.is_active === true && currentAgent.is_active === false) {
            const [agentsResponse, sub] = await Promise.all([
                supabase.from('agents').select('id', { count: 'exact', head: true }).eq('user_id', currentAgent.user_id).eq('is_active', true).is('deleted_at', null),
                billingService.getUserSubscription(currentAgent.user_id)
            ])

            const limits = billingService.getPlanLimits(sub?.plan_id)
            const count = agentsResponse.count || 0

            if (count >= limits.maxActiveAgents) {
                throw new Error(`You have reached the maximum of ${limits.maxActiveAgents} active agents allowed on your current plan. Please deactivate another agent first.`)
            }
        }

        // Enforce Custom LLM Limits
        if (data.model && data.model !== 'gpt-4o' && data.model !== 'gpt-4o-mini') {
            const sub = await billingService.getUserSubscription(currentAgent.user_id)
            const limits = billingService.getPlanLimits(sub?.plan_id)
            if (!limits.customLlm) {
                throw new Error('Custom LLM selection is an Organization plan feature.')
            }
        }

        if (data.name || data.personality || data.characteristics || data.beliefs) {

            // Check name change limit (2 per quarter)
            if (data.name && data.name !== currentAgent.name) {
                if (currentAgent.name_change_count >= 2) {
                    const lastChange = currentAgent.last_name_change ? new Date(currentAgent.last_name_change) : null
                    const threeMonthsAgo = new Date()
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

                    if (lastChange && lastChange > threeMonthsAgo) {
                        throw new Error('Name can only be changed 2 times every 90 days.')
                    }
                    // Reset count if period expired
                    data.name_change_count = 1
                    data.last_name_change = new Date().toISOString()
                } else {
                    data.name_change_count = (currentAgent.name_change_count || 0) + 1
                    data.last_name_change = new Date().toISOString()
                }
            }

            // Check personality/characteristics change limit (2 per quarter)
            if ((data.personality && data.personality !== currentAgent.personality) ||
                (data.characteristics && JSON.stringify(data.characteristics) !== JSON.stringify(currentAgent.characteristics))) {

                if (currentAgent.personality_change_count >= 2) {
                    const lastChange = currentAgent.last_personality_change ? new Date(currentAgent.last_personality_change) : null
                    const threeMonthsAgo = new Date()
                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

                    if (lastChange && lastChange > threeMonthsAgo) {
                        throw new Error('Personality/Characteristics can only be updated 2 times every 90 days.')
                    }
                    // Reset count
                    data.personality_change_count = 1
                    data.last_personality_change = new Date().toISOString()
                } else {
                    data.personality_change_count = (currentAgent.personality_change_count || 0) + 1
                    data.last_personality_change = new Date().toISOString()
                }
            }

            // Check belief change limit (Once every 28 days)
            if (data.beliefs && JSON.stringify(data.beliefs) !== JSON.stringify(currentAgent.beliefs)) {
                const { data: currentBeliefs } = await supabase
                    .from('agents')
                    .select('last_belief_change')
                    .eq('id', agentId)
                    .single()

                const lastChange = currentBeliefs?.last_belief_change ? new Date(currentBeliefs.last_belief_change) : null
                if (lastChange) {
                    const twentyEightDaysAgo = new Date()
                    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)

                    if (lastChange > twentyEightDaysAgo) {
                        const daysLeft = Math.ceil((lastChange.getTime() + (28 * 24 * 60 * 60 * 1000) - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        throw new Error(`Agent beliefs can only be changed once every 28 days. Please wait ${daysLeft} more day(s).`)
                    }
                }
                data.last_belief_change = new Date().toISOString()
            }
        }

        const { error } = await supabase
            .from('agents')
            .update(data)
            .eq('id', agentId)

        if (error) throw error
        return true
    },

    async checkAgentNameAvailability(name: string): Promise<boolean> {
        // Check agents table
        const { data: agentData } = await supabase
            .from('agents')
            .select('id')
            .ilike('name', name)
            .maybeSingle()

        if (agentData) return false // Match found in agents

        // Check profiles table (users)
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id')
            .ilike('username', name)
            .maybeSingle()

        if (profileData) return false // Match found in profiles

        return true // No match found in either
    },

    async createAgent(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at' | 'name_change_count' | 'last_name_change'>) {
        console.log('Creating Agent Payload:', agent)

        // Check availability strictly again before insert
        try {
            const isAvailable = await this.checkAgentNameAvailability(agent.name)
            if (!isAvailable) {
                throw new Error('Agent name is already taken. Please choose another name.')
            }

            // Check user's plan limits
            const [agentsResponse, sub] = await Promise.all([
                supabase.from('agents').select('id', { count: 'exact', head: true }).eq('user_id', agent.user_id).is('deleted_at', null),
                billingService.getUserSubscription(agent.user_id)
            ])

            const limits = billingService.getPlanLimits(sub?.plan_id)
            const count = agentsResponse.count || 0

            if (count >= limits.maxActiveAgents) {
                throw new Error(`You have reached the maximum of ${limits.maxActiveAgents} agents allowed on your current plan.`)
            }

            // Enforce Custom LLM Limits
            if (!limits.customLlm && agent.model && agent.model !== 'gpt-4o' && agent.model !== 'gpt-4o-mini') {
                throw new Error('Custom LLM selection is an Organization plan feature.')
            }

            const { error } = await supabase
                .from('agents')
                .insert(agent)
                .select()
                .single()

            if (error) {
                console.error('Supabase Agent Insert Error:', error)
                if (error.code === '23505') { // Unique violation
                    throw new Error('Agent name is already taken.')
                }
                throw error
            }
            return true
        } catch (err) {
            console.error('Agent Creation Failed:', err)
            throw err
        }
    },

    async getLeaderboard(limit = 10) {
        // 1. Fetch active agents and their post counts 
        // We use the direct relationship for posts since that FK exists
        const { data: agents, error: agentError } = await supabase
            .from('agents')
            .select(`
                *,
                postCount:posts(count)
            `)
            .eq('status', 'active')
            .is('deleted_at', null)
            .limit(limit)

        if (agentError) {
            console.error('Error fetching leaderboard agents:', agentError)
            throw agentError
        }

        if (!agents || agents.length === 0) return []

        // 2. Fetch follower counts for these agents 
        // We do this by querying the follows table directly for these agent IDs
        // This avoids relationship errors with the polymorphic structure
        const agentIds = agents.map(a => a.id)
        const { data: follows, error: followError } = await supabase
            .from('follows')
            .select('following_id')
            .eq('following_type', 'agent')
            .in('following_id', agentIds)

        if (followError) {
            console.error('Error fetching follow counts for leaderboard:', followError)
        }

        // Map follow counts to an easy-access map
        const followCountMap = new Map<string, number>()
        follows?.forEach(f => {
            followCountMap.set(f.following_id, (followCountMap.get(f.following_id) || 0) + 1)
        })

        const { data: { user } } = await supabase.auth.getUser()

        // 3. Map everything together and sort by popularity
        return agents.map(agent => ({
            ...agent,
            followerCount: followCountMap.get(agent.id) || 0,
            postCount: (agent.postCount as any)?.[0]?.count || 0,
            // Mask personality if not owner
            personality: user?.id === agent.user_id ? agent.personality : ''
        })).sort((a, b) => b.followerCount - a.followerCount)
    },

    async isFollowing(followerId: string, followerType: 'user' | 'agent', followingId: string, followingType: 'user' | 'agent'): Promise<boolean> {
        const { data } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', followerId)
            .eq('follower_type', followerType)
            .eq('following_id', followingId)
            .eq('following_type', followingType)
            .maybeSingle()
        return !!data
    },

    async follow(followerId: string, followerType: 'user' | 'agent', followingId: string, followingType: 'user' | 'agent') {
        const { error } = await supabase
            .from('follows')
            .insert({
                follower_id: followerId,
                follower_type: followerType,
                following_id: followingId,
                following_type: followingType
            })
        if (error) throw error

        // Create notification for the user being followed
        // We only notify users when they get a new follower
        if (followingType === 'user') {
            try {
                const notificationPayload: any = {
                    user_id: followingId,
                    type: 'follow',
                    content: 'started following you',
                    metadata: {
                        follower_type: followerType,
                        follower_id: followerId
                    }
                }

                // Only set actor_id if it's an agent, assuming strict FK to agents table
                if (followerType === 'agent') {
                    notificationPayload.actor_id = followerId
                }

                await notificationService.createNotification(notificationPayload)
            } catch (err) {
                console.error('Failed to create notification for follow:', err)
                // Don't fail the follow action if notification fails
            }
        }

        return true
    },

    async unfollow(followerId: string, followerType: 'user' | 'agent', followingId: string, followingType: 'user' | 'agent') {
        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('follower_type', followerType)
            .eq('following_id', followingId)
            .eq('following_type', followingType)
        if (error) throw error
        return true
    },

    async wakeAgentWithIntent(
        agentId: string,
        intent: { type: 'reply' | 'post' | 'join_community'; targetPostId?: string; communityId?: string; content?: string }
    ) {
        const response = await fetch(`/api/wake/${agentId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ intent })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to wake agent')
        }

        return await response.json()
    },

    async deleteAgent(agentId: string) {
        const { error } = await supabase
            .from('agents')
            .update({
                deleted_at: new Date().toISOString(),
                user_id: null,
                name: '[deleted agent]',
                avatar_url: null,
                is_active: false
            })
            .eq('id', agentId)

        if (error) {
            console.error('Error deleting agent:', error)
            throw error
        }
        return true
    }
}
