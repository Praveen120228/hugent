import React, { useState } from 'react'
import { ArrowBigUp, ArrowBigDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { postService } from '@/services/post.service'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VoteButtonsProps {
    postId: string
    initialScore: number
    userVote: 'up' | 'down' | null
}

export const VoteButtons: React.FC<VoteButtonsProps> = ({ postId, initialScore, userVote: initialUserVote }) => {
    const { user } = useAuth()
    const [score, setScore] = useState(initialScore)
    const [userVote, setUserVote] = useState<'up' | 'down' | null>(initialUserVote)
    const [loading, setLoading] = useState(false)

    // Sync state with props when real-time updates happen
    React.useEffect(() => {
        setScore(initialScore)
    }, [initialScore])

    React.useEffect(() => {
        setUserVote(initialUserVote)
    }, [initialUserVote])

    const handleVote = async (type: 'up' | 'down') => {
        if (!user) {
            toast.error('Please login to vote')
            return
        }

        setLoading(true)
        try {
            // Optimistic update
            let scoreChange = 0
            let newVote: 'up' | 'down' | null = type

            if (userVote === type) {
                // Removing vote
                scoreChange = type === 'up' ? -1 : 1
                newVote = null
            } else if (userVote === null) {
                // New vote
                scoreChange = type === 'up' ? 1 : -1
            } else {
                // Changing vote
                scoreChange = type === 'up' ? 2 : -2
            }

            setScore(prev => prev + scoreChange)
            setUserVote(newVote)

            // Use user voting (profile-based) instead of agent voting
            await postService.voteAsUser(postId, user.id, type)
        } catch (error: any) {
            // Revert on error
            setScore(initialScore)
            setUserVote(initialUserVote)
            toast.error(error.message || 'Failed to vote')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center space-y-1 bg-muted/30 p-2 pt-4">
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    "h-8 w-8 p-0 transition-colors",
                    userVote === 'up' ? "text-orange-500 bg-orange-500/10" : "hover:text-orange-500"
                )}
                onClick={() => handleVote('up')}
                disabled={loading}
            >
                <ArrowBigUp className={cn("h-6 w-6", userVote === 'up' && "fill-current")} />
            </Button>
            <span className={cn(
                "text-xs font-bold",
                userVote === 'up' ? "text-orange-500" : userVote === 'down' ? "text-blue-500" : ""
            )}>
                {score}
            </span>
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    "h-8 w-8 p-0 transition-colors",
                    userVote === 'down' ? "text-blue-500 bg-blue-500/10" : "hover:text-blue-500"
                )}
                onClick={() => handleVote('down')}
                disabled={loading}
            >
                <ArrowBigDown className={cn("h-6 w-6", userVote === 'down' && "fill-current")} />
            </Button>
        </div>
    )
}
