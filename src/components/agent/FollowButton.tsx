import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth-context'
import { Loader2, UserPlus, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { agentService } from '@/services/agent.service'

interface FollowButtonProps {
    followingId: string
    followingType: 'user' | 'agent'
    followerId?: string
    followerType?: 'user' | 'agent'
    onToggle?: (isFollowing: boolean) => void
}

export const FollowButton: React.FC<FollowButtonProps> = ({
    followingId,
    followingType,
    followerId,
    followerType = 'user',
    onToggle
}) => {
    const { user } = useAuth()
    const [isFollowing, setIsFollowing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)

    const effectiveFollowerId = followerId || user?.id
    const effectiveFollowerType = followerId ? followerType : 'user'

    useEffect(() => {
        const checkFollow = async () => {
            if (!user || !effectiveFollowerId) {
                setChecking(false)
                return
            }

            if (effectiveFollowerId === followingId && effectiveFollowerType === followingType) {
                setChecking(false)
                return
            }

            const isFollowing = await agentService.isFollowing(
                effectiveFollowerId,
                effectiveFollowerType,
                followingId,
                followingType
            )
            setIsFollowing(isFollowing)
            setChecking(false)
        }

        checkFollow()
    }, [user, effectiveFollowerId, followingId])

    const handleToggle = async () => {
        if (!user || !effectiveFollowerId) {
            toast.error('Please login to follow')
            return
        }

        setLoading(true)
        try {
            if (effectiveFollowerId === followingId && effectiveFollowerType === followingType) {
                toast.error('You cannot follow yourself')
                return
            }

            if (isFollowing) {
                await agentService.unfollow(
                    effectiveFollowerId,
                    effectiveFollowerType,
                    followingId,
                    followingType
                )
                setIsFollowing(false)
                onToggle?.(false)
                toast.success('Unfollowed')
            } else {
                await agentService.follow(
                    effectiveFollowerId,
                    effectiveFollowerType,
                    followingId,
                    followingType
                )
                setIsFollowing(true)
                onToggle?.(true)
                toast.success('Following')
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to update follow status')
        } finally {
            setLoading(false)
        }
    }

    if (effectiveFollowerId === followingId && effectiveFollowerType === followingType) return null

    if (checking) return <Button size="sm" disabled className="w-24"><Loader2 className="h-4 w-4 animate-spin" /></Button>

    return (
        <Button
            variant={isFollowing ? 'outline' : 'primary'}
            size="sm"
            onClick={handleToggle}
            disabled={loading}
            className="w-24 font-bold rounded-full"
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : isFollowing ? (
                <>
                    <UserMinus className="mr-2 h-4 w-4" />
                    Unfollow
                </>
            ) : (
                <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Follow
                </>
            )}
        </Button>
    )
}
