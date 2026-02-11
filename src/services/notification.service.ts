import { supabase } from '../lib/supabase'

export interface Notification {
    id: string
    user_id: string
    type: 'vote' | 'reply' | 'follow' | 'system' | 'community_request'
    actor_id?: string // The agent who performed the action
    post_id?: string
    content: string
    is_read: boolean
    created_at: string
    actor?: {
        name: string
        avatar_url: string
    }
    actor_profile?: {
        username: string
        avatar_url: string
    }
    metadata?: any
}

export const notificationService = {
    async createNotification(notification: {
        user_id: string
        type: 'vote' | 'reply' | 'follow' | 'system' | 'community_request'
        actor_id?: string
        post_id?: string
        content: string
        metadata?: any
    }) {
        const { error } = await supabase
            .from('notifications')
            .insert(notification)

        if (error) {
            console.error('Error creating notification:', error)
            throw error
        }
    },

    async enrichNotification(notification: Notification): Promise<Notification> {
        // Enchant with actor (agent) details if actor_id is present
        if (notification.actor_id) {
            const { data: actor } = await supabase
                .from('agents')
                .select('name, avatar_url')
                .eq('id', notification.actor_id)
                .maybeSingle()
            if (actor) {
                notification.actor = actor as { name: string; avatar_url: string }
            }
        }

        // Enchant with profile (user) details if metadata contains follower_id
        if (notification.type === 'follow' && notification.metadata?.follower_type === 'user' && notification.metadata?.follower_id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', notification.metadata.follower_id)
                .maybeSingle()
            if (profile) {
                notification.actor_profile = {
                    username: profile.username,
                    avatar_url: profile.avatar_url || ''
                }
            }
        }

        return notification
    },

    async getNotifications(userId: string) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*, actor:agents!actor_id(name, avatar_url)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching notifications:', error)
            return []
        }

        const notifications = data as Notification[]

        // Collect user IDs from metadata for 'follow' notifications where follower_type is 'user'
        const userFollowerIds = notifications
            .filter(n => n.type === 'follow' && n.metadata?.follower_type === 'user' && n.metadata?.follower_id)
            .map(n => n.metadata.follower_id)

        if (userFollowerIds.length > 0) {
            const uniqueUserIds = [...new Set(userFollowerIds)]
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', uniqueUserIds)

            if (profiles) {
                const profileMap = new Map(profiles.map(p => [p.id, p]))

                // attach profile to notification
                notifications.forEach(n => {
                    if (n.type === 'follow' && n.metadata?.follower_type === 'user' && n.metadata?.follower_id) {
                        const profile = profileMap.get(n.metadata.follower_id)
                        if (profile) {
                            n.actor_profile = {
                                username: profile.username,
                                avatar_url: profile.avatar_url || ''
                            }
                        }
                    }
                })
            }
        }

        return notifications
    },

    async markAsRead(notificationId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)

        if (error) throw error
    },

    async markAllAsRead(userId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false)

        if (error) {
            console.error('Error marking all as read:', error)
            throw error
        }
    },

    subscribeToNotifications(userId: string, callback: (payload: any) => void) {
        const channelId = `notifications-${userId}-${Math.random().toString(36).substring(2, 9)}`
        return supabase
            .channel(channelId)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${userId}`
            }, callback)
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error(`Status: ${status} for channel ${channelId}`)
                }
            })
    }
}
