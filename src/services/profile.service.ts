import { supabase } from '../lib/supabase'
import { notificationService } from './notification.service'

export interface Profile {
    id: string
    username: string
    avatar_url?: string | null
    full_name?: string | null
    bio?: string | null
    username_change_count: number
    last_username_change: string | null
    updated_at: string
    created_at: string
}

export const profileService = {
    async getProfile(userId: string): Promise<Profile | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()

        if (error) {
            console.error('Error fetching profile:', error.message)
            return null
        }
        return data as Profile
    },

    async getProfileByIdOrUsername(identifier: string): Promise<Profile | null> {
        // Simple UUID regex
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier)

        const query = supabase
            .from('profiles')
            .select('*')

        if (isUuid) {
            query.eq('id', identifier)
        } else {
            query.eq('username', identifier)
        }

        const { data, error } = await query.maybeSingle()

        if (error) {
            console.error('Error fetching profile by identifier:', error.message)
            return null
        }
        return data as Profile
    },

    async updateProfile(userId: string, data: Partial<Profile>) {
        // If updating username, check the 2x/quarter limit
        if (data.username) {
            const { data: currentProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('username, username_change_count, last_username_change')
                .eq('id', userId)
                .single()

            if (fetchError) throw fetchError

            // Only enforce if the username is actually different
            if (currentProfile.username !== data.username) {
                const now = new Date()
                const currentYear = now.getFullYear()
                const currentQuarter = Math.floor(now.getMonth() / 3) + 1

                let lastChangeDate = currentProfile.last_username_change ? new Date(currentProfile.last_username_change) : null
                let changeCount = currentProfile.username_change_count || 0

                if (lastChangeDate) {
                    const lastYear = lastChangeDate.getFullYear()
                    const lastQuarter = Math.floor(lastChangeDate.getMonth() / 3) + 1

                    // Reset count if it's a new quarter
                    if (currentYear > lastYear || (currentYear === lastYear && currentQuarter > lastQuarter)) {
                        changeCount = 0
                    }
                } else {
                    // First time change
                    changeCount = 0
                }

                if (changeCount >= 2) {
                    throw new Error('You can only change your username twice per quarter. Please try again later.')
                }

                // Increment count and update timestamp
                data.username_change_count = changeCount + 1
                data.last_username_change = now.toISOString()
            }
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                ...data,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)

        if (error) throw error
        return true
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

    async isFollowing(followerId: string, followerType: 'user' | 'agent', followingId: string, followingType: 'user' | 'agent') {
        const { data, error } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', followerId)
            .eq('follower_type', followerType)
            .eq('following_id', followingId)
            .eq('following_type', followingType)
            .maybeSingle()
        if (error) return false
        return !!data
    },

    async getFollows(entityId: string, entityType: 'user' | 'agent', type: 'followers' | 'following') {
        const idCol = type === 'followers' ? 'following_id' : 'follower_id'
        const typeCol = type === 'followers' ? 'following_type' : 'follower_type'
        const counterpartIdCol = type === 'followers' ? 'follower_id' : 'following_id'
        const counterpartTypeCol = type === 'followers' ? 'follower_type' : 'following_type'

        const { data, error } = await supabase
            .from('follows')
            .select('*')
            .eq(idCol, entityId)
            .eq(typeCol, entityType)

        if (error) throw error

        // Enrich with profile/agent data
        const enriched = await Promise.all(data.map(async (row) => {
            const id = row[counterpartIdCol]
            const type = row[counterpartTypeCol]

            if (type === 'user') {
                const profile = await this.getProfile(id)
                return { id, type, name: profile?.username || 'Unknown', avatar_url: profile?.avatar_url }
            } else {
                // We'll need a way to get agent details without circular dependency if possible
                // For now, let's just use raw supabase call to avoid service-to-service issues
                const { data: agent } = await supabase.from('agents').select('name, avatar_url').eq('id', id).single()
                return { id, type, name: agent?.name || 'Unknown Agent', avatar_url: agent?.avatar_url }
            }
        }))

        return enriched
    },

    async getProfileStats(userId: string) {
        const [{ data: posts }, { data: social }] = await Promise.all([
            supabase.from('posts').select('id, parent_id, upvotes, downvotes').eq('profile_id', userId),
            supabase.rpc('get_follow_stats', { entity_id: userId, entity_type: 'user' })
        ])

        if (!posts) return { totalVotes: 0, postCount: 0, commentCount: 0, followers: 0, following: 0 }

        let totalVotes = 0
        let postCount = 0
        let commentCount = 0

        posts.forEach(post => {
            if (post.parent_id === null) postCount++
            else commentCount++
            totalVotes += (post.upvotes || 0) - (post.downvotes || 0)
        })

        return {
            totalVotes,
            postCount,
            commentCount,
            followers: (social as any)?.followers || 0,
            following: (social as any)?.following || 0
        }
    },

    async searchProfiles(query: string, limit: number = 20): Promise<Profile[]> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,bio.ilike.%${query}%`)
            .limit(limit)

        if (error) {
            console.error('Error searching profiles:', error)
            return []
        }

        return data || []
    }
}
