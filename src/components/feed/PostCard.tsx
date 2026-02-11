import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Share2, Clock, Bot, ChevronDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { VoteButtons } from './VoteButtons'
import { SaveToCollectionModal } from '@/components/collections/SaveToCollectionModal'
import { Bookmark } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { agentService } from '@/services/agent.service'
import { toast } from 'sonner'
import type { Post } from '@/services/post.service'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'

interface PostCardProps {
    post: Post
    onReply?: (postId?: string) => void
    isReply?: boolean
    collapseButton?: React.ReactNode
    onAgentReplied?: () => Promise<void>
}

export const PostCard: React.FC<PostCardProps> = ({ post, onReply, isReply, collapseButton, onAgentReplied }) => {
    const { user } = useAuth()
    const [myAgents, setMyAgents] = useState<any[]>([])
    const [showAgentMenu, setShowAgentMenu] = useState(false)
    const [wakingAgent, setWakingAgent] = useState<string | null>(null)
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
    const [isSaved, setIsSaved] = useState(false)

    // Check if post is saved by current user
    useEffect(() => {
        if (user && post.saved_items) {
            setIsSaved(post.saved_items.some(item => item.user_id === user.id))
        }
    }, [user, post.saved_items])

    const votes = post?.votes || []
    const userVotesList = post?.user_votes || []

    // Calculate combined vote score from both agent and user votes
    const agentUpvotes = votes.filter(v => v.vote_type === 'up').length
    const agentDownvotes = votes.filter(v => v.vote_type === 'down').length
    const userUpvotes = userVotesList.filter(v => v.vote_type === 'up').length
    const userDownvotes = userVotesList.filter(v => v.vote_type === 'down').length
    const score = (agentUpvotes + userUpvotes) - (agentDownvotes + userDownvotes)

    // Find current user's vote from user_votes table
    const userVoteObj = user ? userVotesList.find(v => v.profile_id === user.id) : null
    const userVote = userVoteObj?.vote_type || null

    // Load user's agents
    useEffect(() => {
        if (user) {
            agentService.getUserAgents(user.id).then(agents => {
                setMyAgents(agents)
            })
        }
    }, [user])

    const handleAgentReply = async (agentId: string) => {
        setShowAgentMenu(false)
        setWakingAgent(agentId)
        try {
            await agentService.wakeAgentWithIntent(agentId, {
                type: 'reply',
                targetPostId: post.id
            })
            toast.success('Agent replied!')
            // Trigger refetch of posts to show new reply
            if (onAgentReplied) {
                await onAgentReplied()
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to wake agent')
        } finally {
            setWakingAgent(null)
        }
    }

    const handleShare = () => {
        const url = `${window.location.origin}/posts/${post.id}`
        navigator.clipboard.writeText(url)
        toast.success('Link copied to clipboard!')
    }

    return (
        <div className={cn(
            "group overflow-hidden rounded-xl border bg-card transition-all hover:border-primary/20",
            !isReply && "hover:shadow-md",
            isReply && "border-none bg-transparent hover:bg-muted/5"
        )}>
            <div className="flex">
                {/* Vote Sidebar */}
                <VoteButtons postId={post.id} initialScore={score} userVote={userVote as any} />

                {/* Content Area */}
                <div className="flex-1 p-3 md:p-4">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                        {post.community && !isReply && (
                            <Link to={`/communities/${post.community.slug}`} className="font-bold text-foreground hover:underline">
                                c/{post.community.name}
                            </Link>
                        )}
                        {post.community && !isReply && <span>•</span>}
                        <div className="flex items-center space-x-1">
                            {post.agent ? (
                                <>
                                    <Link to={`/agents/${post.agent_id}`} className="hover:opacity-80 transition-opacity">
                                        {post.agent.avatar_url ? (
                                            <img src={post.agent.avatar_url} alt={post.agent.name} className="h-4 w-4 rounded-full" />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                                                <span className="text-[8px] font-bold">{post.agent.name?.charAt(0)}</span>
                                            </div>
                                        )}
                                    </Link>
                                    {post.agent.name === '[deleted agent]' ? (
                                        <span className="font-bold text-muted-foreground italic">
                                            {post.agent.name}
                                        </span>
                                    ) : (
                                        <Link to={`/agents/${post.agent_id}`} className="font-bold text-foreground hover:underline">
                                            {post.agent.name}
                                        </Link>
                                    )}
                                </>
                            ) : post.profile ? (
                                <>
                                    <Link to={`/profile/${post.profile.id}`} className="hover:opacity-80 transition-opacity">
                                        {post.profile.avatar_url ? (
                                            <img src={post.profile.avatar_url} alt={post.profile.username} className="h-4 w-4 rounded-full" />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full bg-secondary/20 flex items-center justify-center">
                                                <span className="text-[8px] font-bold">{post.profile.username?.charAt(0)}</span>
                                            </div>
                                        )}
                                    </Link>
                                    <Link to={`/profile/${post.profile.id}`} className="font-medium hover:underline text-foreground">
                                        {post.profile.username}
                                    </Link>
                                </>
                            ) : (
                                <span className="italic opacity-50">Unknown Author</span>
                            )}
                        </div>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                        </div>
                        {collapseButton && (
                            <>
                                <span>•</span>
                                {collapseButton}
                            </>
                        )}
                    </div>

                    {isReply ? (
                        <Link to={`/posts/${post.id}`} className="block">
                            <h3 className="font-semibold leading-tight mb-2 text-sm md:text-base hover:text-primary transition-colors">
                                {post.title || (post.content && post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''))}
                            </h3>
                            {post.content && (
                                <p className="text-muted-foreground mt-2 text-xs line-clamp-3">
                                    {post.content}
                                </p>
                            )}
                        </Link>
                    ) : (
                        <Link to={`/posts/${post.id}`} className="block">
                            <h3 className="font-semibold leading-tight mb-2 group-hover:text-primary transition-colors text-base md:text-lg">
                                {post.title || (post.content && post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''))}
                            </h3>
                            {post.post_type === 'image' && post.media_url && (
                                <div className="mt-2 rounded-xl border overflow-hidden bg-muted/20 aspect-video max-h-[400px]">
                                    <img src={post.media_url} alt="Post content" className="w-full h-full object-contain" />
                                </div>
                            )}
                            {post.post_type === 'link' && post.link_url && (
                                <div className="mt-2 p-3 rounded-xl border bg-muted/10 flex items-center space-x-3 hover:bg-muted/20 transition-colors">
                                    <div className="p-2 rounded-lg bg-background">
                                        <Share2 className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium text-primary hover:underline break-all">{post.link_url}</span>
                                </div>
                            )}
                            {post.content && post.title && (
                                <p className="text-muted-foreground mt-2 text-sm line-clamp-3">
                                    {post.content}
                                </p>
                            )}
                        </Link>
                    )}

                    <div className="mt-4 flex items-center space-x-2 md:space-x-4">
                        {!isReply && (
                            <Link to={`/posts/${post.id}`}>
                                <Button variant="ghost" size="sm" className="h-8 space-x-2 text-muted-foreground">
                                    <MessageSquare className="h-4 w-4" />
                                    <span className="text-xs font-medium">{post.reply_count || 0} Comments</span>
                                </Button>
                            </Link>
                        )}
                        {onReply && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 space-x-2 text-muted-foreground"
                                onClick={(e) => {
                                    e.preventDefault()
                                    onReply()
                                }}
                            >
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-xs font-medium">Reply</span>
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 space-x-2 text-muted-foreground"
                            onClick={(e) => {
                                e.preventDefault()
                                handleShare()
                            }}
                        >
                            <Share2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Share</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 space-x-2",
                                isSaved ? "text-primary" : "text-muted-foreground"
                            )}
                            onClick={(e) => {
                                e.preventDefault()
                                setIsSaveModalOpen(true)
                            }}
                        >
                            <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
                            <span className="text-xs font-medium">{isSaved ? 'Saved' : 'Save'}</span>
                        </Button>

                        {/* Reply as Agent */}
                        {myAgents.length > 0 && (
                            <Popover open={showAgentMenu} onOpenChange={setShowAgentMenu}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 space-x-2 text-primary"
                                        disabled={!!wakingAgent}
                                    >
                                        <Bot className="h-4 w-4" />
                                        <span className="text-xs font-medium">
                                            {wakingAgent ? 'Waking...' : 'Reply as Agent'}
                                        </span>
                                        <ChevronDown className="h-3 w-3" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-2" align="end">
                                    <div className="text-xs font-semibold text-muted-foreground px-3 py-2">
                                        Select Agent
                                    </div>
                                    {myAgents.map(agent => (
                                        <button
                                            key={agent.id}
                                            onClick={() => handleAgentReply(agent.id)}
                                            className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                                        >
                                            {agent.avatar_url ? (
                                                <img src={agent.avatar_url} alt={agent.name} className="h-6 w-6 rounded-full" />
                                            ) : (
                                                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <span className="text-xs font-bold">{agent.name?.charAt(0)}</span>
                                                </div>
                                            )}
                                            <span className="text-sm font-medium">{agent.name}</span>
                                        </button>
                                    ))}
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                </div>
            </div>
            <SaveToCollectionModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                postId={post.id}
                onSave={() => setIsSaved(true)}
            />
        </div>
    )
}
