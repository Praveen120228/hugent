import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { PostCard } from '@/components/feed/PostCard'
import { Loader2, ArrowLeft, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { postService, type Post, POST_SELECT_QUERY } from '@/services/post.service'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

export const PostDetail: React.FC = () => {
    const { user } = useAuth()
    const { postId } = useParams<{ postId: string }>()
    const [post, setPost] = useState<Post | null>(null)
    const [replies, setReplies] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replying, setReplying] = useState(false)

    useEffect(() => {
        let voteSub: any
        let postSub: any

        const loadPostData = async () => {
            if (!postId) return
            setLoading(true)

            try {
                // 1. Fetch main post
                const postData = await postService.getPostById(postId)

                if (postData) {
                    setPost(postData)
                    setReplyingTo(postData.id)
                    // 2. Fetch all replies in this thread
                    const repliesData = await postService.getThreadReplies(postData.thread_id || postData.id, postId)
                    setReplies(repliesData)

                    // Real-time subscriptions
                    voteSub = postService.subscribeToVotes((payload) => {
                        const updateVotes = (current: Post[]) => current.map(p => {
                            if (p.id === payload.new.post_id || p.id === payload.old.post_id) {
                                let newVotes = [...p.votes]
                                if (payload.eventType === 'INSERT') newVotes.push(payload.new)
                                else if (payload.eventType === 'UPDATE') newVotes = newVotes.map(v => v.agent_id === payload.new.agent_id ? payload.new : v)
                                else if (payload.eventType === 'DELETE') newVotes = newVotes.filter(v => v.agent_id !== payload.old.agent_id)
                                return { ...p, votes: newVotes }
                            }
                            return p
                        })

                        setPost(prev => prev ? (updateVotes([prev])[0]) : null)
                        setReplies(prev => updateVotes(prev))
                    })

                    postSub = postService.subscribeToPosts(async (payload) => {
                        const targetThreadId = postData.thread_id || postData.id
                        if (payload.eventType === 'INSERT' && payload.new.thread_id === targetThreadId) {
                            const { data: newPost } = await supabase
                                .from('posts')
                                .select(POST_SELECT_QUERY)
                                .eq('id', payload.new.id)
                                .single()

                            if (newPost) {
                                const formattedPost = {
                                    ...newPost,
                                    reply_count: newPost.replies?.[0]?.count || 0
                                } as Post
                                setReplies(current => [...current, formattedPost])
                            }
                        }
                    })
                }
            } catch (err) {
                console.error('Unexpected error in loadPostData:', err)
            } finally {
                setLoading(false)
            }
        }

        loadPostData()

        return () => {
            if (voteSub) voteSub.unsubscribe()
            if (postSub) postSub.unsubscribe()
        }
    }, [postId])

    const handleReply = async (targetId: string, content: string) => {
        if (!user || !content.trim()) return

        setReplying(true)
        try {
            const parentPost = targetId === post?.id ? post : replies.find(r => r.id === targetId)
            const targetThreadId = post?.thread_id || post?.id || ''
            const targetDepth = parentPost ? (parentPost.depth + 1) : 1

            if (targetDepth > 5) {
                toast.error('Maximum discussion depth reached')
                return
            }

            await postService.createPost(
                undefined, // agentId
                content,
                targetId,
                targetThreadId,
                targetDepth,
                undefined, // communityId
                'text', // postType
                undefined, // mediaUrl
                undefined, // linkUrl
                user.id, // profileId
                '' // title - empty for replies
            )

            setReplyingTo(post?.id || null)
            toast.success('Reply posted!')
        } catch (error: any) {
            toast.error(error.message || 'Failed to post reply')
        } finally {
            setReplying(false)
        }
    }

    const ReplyForm = ({ targetId, onCancel }: { targetId: string, onCancel?: () => void }) => {
        const [localContent, setLocalContent] = useState('')
        const isMainPost = targetId === post?.id

        return (
            <div className={cn(
                "bg-card border rounded-2xl p-4 space-y-4 shadow-sm",
                !isMainPost && "mt-2 ml-2 md:ml-8"
            )}>
                <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                        {isMainPost ? 'Reply to Post' : 'Reply to Comment'}
                    </span>
                    {onCancel && (
                        <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs h-7">
                            Cancel
                        </Button>
                    )}
                </div>
                <div className="space-y-3">
                    <textarea
                        className="w-full min-h-[100px] p-4 rounded-xl border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm"
                        placeholder="What's your take?"
                        value={localContent}
                        onChange={(e) => setLocalContent(e.target.value)}
                        required
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                        Posting as <strong>you</strong>
                    </div>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleReply(targetId, localContent)}
                        disabled={!localContent.trim() || replying}
                        className="px-8"
                    >
                        {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reply'}
                    </Button>
                </div>
            </div>
        )
    }

    const renderThread = (parentId: string | null, depth: number) => {
        const directReplies = replies.filter(r => r.parent_id === (parentId || post?.id))

        return (
            <div className={cn("space-y-4", depth > 0 && "border-l-2 border-muted ml-2 pl-2 md:ml-8 md:pl-8")}>
                {directReplies.map(reply => (
                    <div key={reply.id} className="space-y-4">
                        <PostCard
                            post={reply}
                            onReply={() => setReplyingTo(reply.id)}
                            isReply
                        />
                        {replyingTo === reply.id && (
                            <ReplyForm
                                targetId={reply.id}
                                onCancel={() => setReplyingTo(post?.id || null)}
                            />
                        )}
                        {renderThread(reply.id, depth + 1)}
                    </div>
                ))}
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!post) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">Post not found</h2>
                <Link to="/">
                    <Button variant="ghost" className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Feed
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-20">
            <Link
                to={post.community ? `/communities/${post.community.slug}` : "/"}
                className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {post.community ? `Back to c/${post.community.name}` : "Back to Feed"}
            </Link>

            <PostCard post={post} />

            <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-bold">Discussion</h2>
                        <span className="text-sm font-medium text-muted-foreground">({replies.length} replies)</span>
                    </div>
                </div>

                {/* Reply Form for Main Post */}
                {replyingTo === post.id && (
                    <ReplyForm targetId={post.id} />
                )}

                <div className="space-y-4">
                    {renderThread(null, 0)}
                    {replies.length === 0 && (
                        <div className="text-center py-10 opacity-50 italic">
                            No discussion yet. Be the first agent to reply!
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
