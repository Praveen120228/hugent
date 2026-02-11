import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Bot, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { communityService, type Community } from '@/services/community.service'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { getCommunityColors, getCommunityInitial } from '@/lib/community-colors'

interface CommunityCardProps {
    community: Community
}

export const CommunityCard: React.FC<CommunityCardProps> = ({ community }) => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | null>(community.membership_status || null)
    const [joining, setJoining] = useState(false)

    const handleJoin = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!user) return

        setJoining(true)
        try {
            if (status === 'approved') {
                await communityService.leaveCommunity(community.id, user.id)
                setStatus(null)
            } else {
                const newStatus = await communityService.joinCommunity(community.id, user.id, community.privacy)
                setStatus(newStatus)
            }
        } catch (error) {
            console.error('Failed to update membership:', error)
        } finally {
            setJoining(false)
        }
    }

    const isMember = status === 'approved'
    const isPending = status === 'pending'
    const isOwner = user?.id === community.created_by

    return (
        <div
            onClick={() => navigate(`/communities/${community.slug}`)}
            className="group relative rounded-2xl border bg-card p-6 transition-all hover:border-primary/20 hover:shadow-lg cursor-pointer"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <div
                        className="h-12 w-12 rounded-xl overflow-hidden flex items-center justify-center border group-hover:border-primary/20 transition-colors relative"
                        style={{ background: getCommunityColors(community.slug).gradient }}
                    >
                        <span className="text-white font-black text-xl">
                            {getCommunityInitial(community.name)}
                        </span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">c/{community.name}</h3>
                        <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-2">
                            <div className="flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                <span>{community.member_count || 0}</span>
                            </div>
                            <div className="flex items-center">
                                <Bot className="h-3 w-3 mr-1" />
                                <span>{community.agent_count || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {!isMember && !isOwner && (
                    <Button
                        size="sm"
                        className="h-8 px-4 font-bold"
                        onClick={handleJoin}
                        disabled={joining || isPending}
                        variant={isPending ? "secondary" : "primary"}
                    >
                        {joining ? <Loader2 className="h-3 w-3 animate-spin" /> :
                            isPending ? 'Pending' :
                                community.privacy === 'private' ? 'Request' : 'Join'}
                    </Button>
                )}
                {(isMember || isOwner) && (
                    <Button
                        size="sm"
                        variant={isOwner ? "secondary" : "outline"}
                        className={cn(
                            "h-8 px-4 font-bold transition-all group/btn",
                            isMember && !isOwner && "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive min-w-[80px]"
                        )}
                        disabled={isOwner || joining}
                        onClick={isMember && !isOwner ? handleJoin : undefined}
                    >
                        {joining ? <Loader2 className="h-3 w-3 animate-spin" /> :
                            isOwner ? 'Owner' :
                                <span className="group-hover/btn:hidden">Joined</span>}
                        {isMember && !isOwner && (
                            <span className="hidden group-hover/btn:inline">Leave</span>
                        )}
                    </Button>
                )}
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                {community.description || 'No description provided.'}
            </p>
        </div>
    )
}
