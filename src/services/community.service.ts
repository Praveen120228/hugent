import { supabase } from '../lib/supabase'

export interface Community {
    id: string
    name: string
    slug: string
    description: string | null
    avatar_url: string | null
    banner_url: string | null
    created_by: string | null
    created_at: string | null
    privacy: 'public' | 'private'
    member_count?: number
    agent_count?: number
    membership_status?: 'pending' | 'approved' | 'rejected' | null
}

import { notificationService } from './notification.service'

export const communityService = {
    async getCommunities(userId?: string): Promise<Community[]> {
        const { data: communities, error } = await supabase
            .from('communities')
            .select('*, community_memberships(count), agent_community_memberships(count)')
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching communities:', error)
            return []
        }

        let memberships: any[] = []
        if (userId) {
            const { data: userMemberships } = await supabase
                .from('community_memberships')
                .select('community_id, status')
                .eq('user_id', userId)

            if (userMemberships) memberships = userMemberships
        }

        return (communities || []).map(c => {
            const membership = memberships.find(m => m.community_id === c.id)
            return {
                ...c,
                member_count: c.community_memberships?.[0]?.count || 0,
                agent_count: c.agent_community_memberships?.[0]?.count || 0,
                membership_status: membership ? membership.status : null
            }
        })
    },

    async getCommunityBySlug(slug: string): Promise<Community | null> {
        const { data, error } = await supabase
            .from('communities')
            .select('*')
            .eq('slug', slug)
            .single()

        if (error || !data) return null

        // Get member count separately if needed or via joint
        const { count: memberCount } = await supabase
            .from('community_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', data.id)
            .eq('status', 'approved') // Only count approved members

        const { count: agentCount } = await supabase
            .from('agent_community_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', data.id)
            .eq('status', 'approved')

        return {
            ...data,
            member_count: memberCount || 0,
            agent_count: agentCount || 0
        }
    },

    async searchCommunities(query: string): Promise<Community[]> {
        const { data, error } = await supabase
            .from('communities')
            .select('*')
            .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(10)

        if (error) {
            console.error('Error searching communities:', error)
            return []
        }
        return data || []
    },

    async checkCommunityNameAvailability(name: string): Promise<boolean> {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

        const { data } = await supabase
            .from('communities')
            .select('id')
            .eq('slug', slug)
            .maybeSingle()

        return !data
    },

    async createCommunity(community: {
        name: string,
        description: string,
        privacy: 'public' | 'private',
        created_by: string
    }): Promise<Community | null> {
        const slug = community.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

        const { data, error } = await supabase
            .from('communities')
            .insert({
                ...community,
                slug,
                banner_url: `https://source.unsplash.com/random/1200x400/?${community.name},abstract`, // Placeholder
                avatar_url: `https://ui-avatars.com/api/?name=${community.name}&background=random` // Placeholder
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating community:', error)
            throw error
        }

        return data
    },

    async joinCommunity(communityId: string, userId: string, privacy: 'public' | 'private'): Promise<'approved' | 'pending'> {
        const targetStatus = privacy === 'public' ? 'approved' : 'pending'

        // Check for existing membership
        const { data: existing } = await supabase
            .from('community_memberships')
            .select('status, role')
            .eq('community_id', communityId)
            .eq('user_id', userId)
            .maybeSingle()

        if (existing) {
            if (existing.status === 'approved') return 'approved'
            if (existing.status === 'pending') return 'pending'

            // If rejected or left (if we had that state), allow re-join/re-request
            // Update to pending/approved
            const { error: updateError } = await supabase
                .from('community_memberships')
                .update({ status: targetStatus })
                .eq('community_id', communityId)
                .eq('user_id', userId)

            if (updateError) throw updateError
        } else {
            // New membership
            const { error: insertError } = await supabase
                .from('community_memberships')
                .insert({
                    community_id: communityId,
                    user_id: userId,
                    role: 'member',
                    status: targetStatus
                })

            if (insertError) throw insertError
        }

        // If private and (new request OR re-request), notify owner
        // We notify if we just set it to 'pending' (targetStatus === 'pending')
        // AND (it was a new insert OR it was previously rejected) -> covered by logic above
        if (privacy === 'private' && (!existing || existing.status === 'rejected')) {
            const { data: community } = await supabase
                .from('communities')
                .select('created_by, name')
                .eq('id', communityId)
                .single()

            if (community?.created_by) {
                await notificationService.createNotification({
                    user_id: community.created_by,
                    type: 'community_request',
                    content: `Request to join ${community.name}`,
                    metadata: {
                        community_id: communityId,
                        requester_id: userId,
                        community_name: community.name
                    }
                })
            }
        }

        return targetStatus
    },

    async getMembership(communityId: string, userId: string) {
        const { data } = await supabase
            .from('community_memberships')
            .select('*')
            .eq('community_id', communityId)
            .eq('user_id', userId)
            .single()

        return data
    },

    async approveRequest(requesterId: string, communityId: string) {
        // Either update via notification metadata logic or direct DB update if we had a request ID
        // Since we store requests as memberships with 'pending' status:
        const { error } = await supabase
            .from('community_memberships')
            .update({ status: 'approved' })
            .eq('community_id', communityId)
            .eq('user_id', requesterId)

        if (error) throw error
    },

    async rejectRequest(requesterId: string, communityId: string) {
        const { error } = await supabase
            .from('community_memberships')
            .update({ status: 'rejected' }) // Or delete
            .eq('community_id', communityId)
            .eq('user_id', requesterId)

        if (error) throw error
    },
    async leaveCommunity(communityId: string, userId: string) {
        const { error } = await supabase
            .from('community_memberships')
            .delete()
            .eq('community_id', communityId)
            .eq('user_id', userId)

        if (error) throw error
    },

    async getAgentMembership(communityId: string, agentId: string) {
        const { data } = await supabase
            .from('agent_community_memberships')
            .select('*')
            .eq('community_id', communityId)
            .eq('agent_id', agentId)
            .maybeSingle()

        return data
    },

    async agentJoinCommunity(communityId: string, agentId: string): Promise<'approved' | 'pending'> {
        // Simplified for now: agents automatically approved for public, pending for private
        // Need to check community privacy first
        const { data: community } = await supabase
            .from('communities')
            .select('privacy')
            .eq('id', communityId)
            .single()

        const targetStatus = community?.privacy === 'public' ? 'approved' : 'pending'

        const { error } = await supabase
            .from('agent_community_memberships')
            .upsert({
                community_id: communityId,
                agent_id: agentId,
                role: 'member',
                status: targetStatus
            }, { onConflict: 'community_id,agent_id' })

        if (error) throw error
        return targetStatus
    },

    async agentLeaveCommunity(communityId: string, agentId: string) {
        const { error } = await supabase
            .from('agent_community_memberships')
            .delete()
            .eq('community_id', communityId)
            .eq('agent_id', agentId)

        if (error) throw error
    },

    async getAgentMemberships(communityId: string, userId: string) {
        // Get all agents owned by this user and their membership status for this community
        const { data: agents, error: agentsError } = await supabase
            .from('agents')
            .select('id, name, username')
            .eq('user_id', userId)

        if (agentsError) throw agentsError

        const { data: memberships, error: membershipsError } = await supabase
            .from('agent_community_memberships')
            .select('agent_id, status')
            .eq('community_id', communityId)

        if (membershipsError) throw membershipsError

        return (agents || []).map(agent => ({
            ...agent,
            membership_status: memberships?.find(m => m.agent_id === agent.id)?.status || null
        }))
    }
}
