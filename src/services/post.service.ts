import { supabase } from '../lib/supabase'

export interface Post {
    id: string
    agent_id: string | null
    profile_id: string | null
    title?: string | null
    content: string | null
    created_at: string
    parent_id: string | null
    thread_id: string
    depth: number
    agent?: {
        id: string
        name: string
        avatar_url?: string | null
        user_id: string
    } | null
    profile?: {
        id: string
        username: string
        avatar_url?: string | null
    } | null
    votes: Array<{
        vote_type: 'up' | 'down'
        agent_id: string | null
        profile_id: string | null
    }>
    user_votes?: Array<{
        vote_type: 'up' | 'down'
        profile_id: string
    }>
    reply_count?: number
    community?: {
        id: string
        name: string
        slug: string
    } | null
    post_type: 'text' | 'image' | 'link'
    media_url?: string | null
    link_url?: string | null
    replies?: Array<{ count: number }>
    saved_items?: Array<{ user_id: string }>
}

export const POST_SELECT_QUERY = '*, agent:agents(id, name, avatar_url, user_id), profile:profiles(id, username, avatar_url), votes(vote_type, agent_id), user_votes(vote_type, profile_id), community:communities(id, name, slug), replies:posts!parent_id(count), saved_items(user_id)'

export const postService = {
    async getPosts(limit: number = 20, sortBy: 'new' | 'hot' | 'top' = 'new', before?: string): Promise<Post[]> {
        let query = supabase
            .from('posts')
            .select(POST_SELECT_QUERY)
            .is('parent_id', null)
            .limit(limit)

        if (before) {
            query = query.lt('created_at', before)
        }

        if (sortBy === 'new') {
            query = query.order('created_at', { ascending: false })
        } else if (sortBy === 'top') {
            query = query.order('created_at', { ascending: false })
        }

        const { data, error } = await query
        if (error) {
            console.error('Error fetching posts:', error.message, error.details, error.hint)
            return []
        }

        return (data || []).map(p => ({
            ...p,
            reply_count: p.replies?.[0]?.count || 0
        })) as Post[]
    },

    async vote(postId: string, agentId: string, voteType: 'up' | 'down') {
        // Check for existing vote
        const { data: existing } = await supabase
            .from('votes')
            .select('id, vote_type')
            .eq('post_id', postId)
            .eq('agent_id', agentId)
            .maybeSingle()

        if (existing) {
            if (existing.vote_type === voteType) {
                // Remove vote
                return supabase.from('votes').delete().eq('id', existing.id)
            } else {
                // Update vote
                return supabase.from('votes').update({ vote_type: voteType }).eq('id', existing.id)
            }
        } else {
            // New vote
            return supabase.from('votes').insert({
                post_id: postId,
                agent_id: agentId,
                vote_type: voteType
            })
        }
    },

    async getUserPosts(userId: string, limit: number = 20, before?: string): Promise<Post[]> {
        let query = supabase
            .from('posts')
            .select(POST_SELECT_QUERY)
            .eq('profile_id', userId)
            .limit(limit)
            .order('created_at', { ascending: false })

        if (before) {
            query = query.lt('created_at', before)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching user posts:', error.message)
            return []
        }

        return (data || []).map(p => ({
            ...p,
            reply_count: p.replies?.[0]?.count || 0
        })) as Post[]
    },


    async getCommunityPosts(communityId: string, limit: number = 20, before?: string): Promise<Post[]> {
        let query = supabase
            .from('posts')
            .select(POST_SELECT_QUERY)
            .eq('community_id', communityId)
            .is('parent_id', null)
            .limit(limit)
            .order('created_at', { ascending: false })

        if (before) {
            query = query.lt('created_at', before)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching community posts:', error.message)
            return []
        }

        return (data || []).map(p => ({
            ...p,
            reply_count: p.replies?.[0]?.count || 0
        })) as Post[]
    },

    async getPostById(postId: string): Promise<Post | null> {
        const { data, error } = await supabase
            .from('posts')
            .select(POST_SELECT_QUERY)
            .eq('id', postId)
            .single()

        if (error || !data) return null

        return {
            ...data,
            reply_count: data.replies?.[0]?.count || 0
        } as Post
    },

    async getThreadReplies(threadId: string, excludeId?: string): Promise<Post[]> {
        let query = supabase
            .from('posts')
            .select(POST_SELECT_QUERY)
            .eq('thread_id', threadId)

        if (excludeId) {
            query = query.neq('id', excludeId)
        }

        const { data, error } = await query.order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching thread replies:', error.message)
            return []
        }

        return (data || []).map(p => ({
            ...p,
            reply_count: p.replies?.[0]?.count || 0
        })) as Post[]
    },

    async createPost(
        agentId: string | undefined,
        content: string,
        parentId?: string,
        threadId?: string,
        depth: number = 0,
        communityId?: string,
        postType: 'text' | 'image' | 'link' = 'text',
        mediaUrl?: string,
        linkUrl?: string,
        profileId?: string,
        title?: string
    ) {
        const postData: any = {
            agent_id: agentId || null,
            profile_id: profileId || null,
            title: title || null,
            content,
            parent_id: parentId || null,
            parent_post_id: parentId || null, // Sync for compatibility
            thread_id: threadId || null,
            depth,
            post_type: postType,
            media_url: mediaUrl,
            link_url: linkUrl
        }

        if (communityId) {
            postData.community_id = communityId
        }

        const { data, error } = await supabase.from('posts').insert(postData).select().single()
        if (error) throw error

        // If it's a root post, it's its own thread_id
        if (!threadId) {
            await supabase.from('posts').update({ thread_id: data.id }).eq('id', data.id)
        }

        return data
    },

    async getAgentPosts(agentId: string, limit: number = 20, before?: string): Promise<Post[]> {
        let query = supabase
            .from('posts')
            .select(POST_SELECT_QUERY)
            .eq('agent_id', agentId)
            .is('parent_id', null)
            .limit(limit)
            .order('created_at', { ascending: false })

        if (before) {
            query = query.lt('created_at', before)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching agent posts:', error.message)
            return []
        }

        return (data || []).map(p => ({
            ...p,
            reply_count: p.replies?.[0]?.count || 0
        })) as Post[]
    },

    async getAgentActivity(agentId: string, limit: number = 20, before?: string): Promise<any[]> {
        // 1. Fetch Posts & Replies (all posts by agent)
        let postsQuery = supabase
            .from('posts')
            .select(POST_SELECT_QUERY)
            .eq('agent_id', agentId)
            .limit(limit)
            .order('created_at', { ascending: false })

        if (before) {
            postsQuery = postsQuery.lt('created_at', before)
        }

        const { data: posts, error: postsError } = await postsQuery

        if (postsError) {
            console.error('Error fetching agent activity (posts):', postsError.message)
            return []
        }

        // 2. Fetch Votes
        let votesQuery = supabase
            .from('votes')
            .select('*, post:posts(id, title, content, created_at, agent:agents(name, avatar_url), profile:profiles(username, avatar_url))')
            .eq('agent_id', agentId)
            .limit(limit)
            .order('created_at', { ascending: false })

        if (before) {
            votesQuery = votesQuery.lt('created_at', before)
        }

        const { data: votes, error: votesError } = await votesQuery

        if (votesError) {
            console.error('Error fetching agent activity (votes):', votesError.message)
            return []
        }

        // 3. Combine and Format
        const activity = [
            ...(posts || []).map(p => ({
                type: p.parent_id ? 'reply' : 'post',
                date: new Date(p.created_at),
                data: {
                    ...p,
                    reply_count: p.replies?.[0]?.count || 0
                }
            })),
            ...(votes || []).map(v => ({
                type: v.vote_type === 'up' ? 'upvote' : 'downvote',
                date: new Date(v.created_at),
                data: v.post
            }))
        ]

        // 4. Sort by Date Descending
        return activity.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, limit)
    },

    subscribeToVotes(callback: (payload: any) => void) {
        const channelId = `votes-${Math.random().toString(36).substring(2, 9)}`
        return supabase
            .channel(channelId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, callback)
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error(`Status: ${status} for channel ${channelId}`)
                }
            })
    },

    async voteAsUser(postId: string, profileId: string, voteType: 'up' | 'down') {
        // Check for existing vote
        const { data: existing } = await supabase
            .from('user_votes')
            .select('*')
            .eq('post_id', postId)
            .eq('profile_id', profileId)
            .maybeSingle()

        if (existing) {
            if (existing.vote_type === voteType) {
                // Remove vote (click same button again)
                const { error } = await supabase
                    .from('user_votes')
                    .delete()
                    .eq('id', existing.id)

                if (error) throw error
            } else {
                // Change vote (up to down or down to up)
                const { error } = await supabase
                    .from('user_votes')
                    .update({ vote_type: voteType, updated_at: new Date().toISOString() })
                    .eq('id', existing.id)

                if (error) throw error
            }
        } else {
            // New vote
            const { error } = await supabase
                .from('user_votes')
                .insert({ post_id: postId, profile_id: profileId, vote_type: voteType })

            if (error) throw error
        }
    },

    async getUserVoteActivity(userId: string, limit: number = 20, before?: string): Promise<any[]> {
        // Fetch user votes with post details
        let query = supabase
            .from('user_votes')
            .select(`
                *,
                post:posts(
                    id,
                    title,
                    content,
                    created_at,
                    agent:agents(id, name, avatar_url),
                    profile:profiles(id, username, avatar_url),
                    community:communities(id, name, slug)
                )
            `)
            .eq('profile_id', userId)
            .limit(limit)
            .order('created_at', { ascending: false })

        if (before) {
            query = query.lt('created_at', before)
        }

        const { data: votes, error } = await query

        if (error) {
            console.error('Error fetching user vote activity:', error.message)
            return []
        }

        return votes || []
    },

    subscribeToPosts(callback: (payload: any) => void) {
        const channelId = `posts-${Math.random().toString(36).substring(2, 9)}`
        return supabase
            .channel(channelId)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, callback)
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error(`Status: ${status} for channel ${channelId}`)
                }
            })
    },

    async searchPosts(query: string, limit: number = 20): Promise<Post[]> {
        const { data, error } = await supabase
            .from('posts')
            .select(POST_SELECT_QUERY)
            .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
            .limit(limit)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error searching posts:', error)
            return []
        }

        return data || []
    },

    async deletePost(postId: string) {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)

        if (error) throw error
        return true
    }
}
