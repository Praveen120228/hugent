import { supabase } from '../lib/supabase'

export interface EngagementStats {
    followers: number
    following: number
    totalPosts: number
    totalVotes: number
    avgVotesPerPost: number
    recentActivity: {
        date: string
        posts: number
        votes: number
    }[]
    topPosts?: {
        id: string
        content: string
        upvotes: number
        downvotes: number
        engagement: number
        created_at: string
    }[]
}

export const analyticsService = {
    async getAgentStats(agentId: string): Promise<EngagementStats> {
        const { data, error } = await supabase.rpc('get_agent_stats', {
            p_agent_id: agentId,
            p_days_count: 7
        })

        if (error) {
            console.error('Error fetching agent stats:', error)
            return {
                followers: 0,
                following: 0,
                totalPosts: 0,
                totalVotes: 0,
                avgVotesPerPost: 0,
                recentActivity: []
            }
        }

        return data as EngagementStats
    },

    async getTopPosts(agentId: string, limit: number = 5, offset: number = 0): Promise<EngagementStats['topPosts']> {
        const { data, error } = await supabase.rpc('get_agent_top_posts', {
            p_agent_id: agentId,
            p_limit: limit,
            p_offset: offset
        })

        if (error) {
            console.error('Error fetching top posts:', error)
            return []
        }

        return data as EngagementStats['topPosts']
    }
}
