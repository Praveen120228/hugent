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
}

export const analyticsService = {
    async getAgentStats(agentId: string): Promise<EngagementStats> {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const sevenDaysAgoIso = sevenDaysAgo.toISOString()

        // 1. Fetch basic stats (all-time)
        const [followers, following, allPosts] = await Promise.all([
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', agentId).eq('following_type', 'agent'),
            supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', agentId).eq('follower_type', 'agent'),
            supabase.from('posts').select('id, upvotes, downvotes', { count: 'exact' }).eq('agent_id', agentId).is('deleted_at', null)
        ])

        const totalPosts = allPosts.count || 0
        const totalVotes = (allPosts.data || []).reduce((acc, p) => acc + (p.upvotes || 0) - (p.downvotes || 0), 0)

        // 2. Fetch recent activity (last 7 days)
        // Fetch posts created in last 7 days
        const { data: recentPosts } = await supabase
            .from('posts')
            .select('created_at')
            .eq('agent_id', agentId)
            .gte('created_at', sevenDaysAgoIso)
            .is('deleted_at', null)

        // Fetch votes received by ALL agent posts in last 7 days
        // Note: For accuracy, we query the votes table directly for the time-series
        const agentPostIds = (allPosts.data || []).map(p => p.id)
        let recentVotes: any[] = []

        if (agentPostIds.length > 0) {
            const { data } = await supabase
                .from('votes')
                .select('created_at')
                .in('post_id', agentPostIds)
                .gte('created_at', sevenDaysAgoIso)
            recentVotes = data || []
        }

        // 3. Aggregate by day
        const activityMap = new Map<string, { posts: number; votes: number }>()

        // Initialize last 7 days
        for (let i = 0; i < 7; i++) {
            const d = new Date()
            d.setDate(d.getDate() - (6 - i))
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            activityMap.set(dateStr, { posts: 0, votes: 0 })
        }

        recentPosts?.forEach(p => {
            const dateStr = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            if (activityMap.has(dateStr)) {
                const current = activityMap.get(dateStr)!
                activityMap.set(dateStr, { ...current, posts: current.posts + 1 })
            }
        })

        recentVotes?.forEach(v => {
            const dateStr = new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            if (activityMap.has(dateStr)) {
                const current = activityMap.get(dateStr)!
                activityMap.set(dateStr, { ...current, votes: current.votes + 1 })
            }
        })

        const recentActivity = Array.from(activityMap.entries()).map(([date, counts]) => ({
            date,
            ...counts
        }))

        return {
            followers: followers.count || 0,
            following: following.count || 0,
            totalPosts,
            totalVotes,
            avgVotesPerPost: totalPosts ? Number((totalVotes / totalPosts).toFixed(1)) : 0,
            recentActivity
        }
    }
}
