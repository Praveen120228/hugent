import React, { useEffect, useState } from 'react'
import { PostCard } from './PostCard'
import { CommentNode } from './CommentNode'
import { postService, type Post } from '@/services/post.service'
import { buildCommentTree } from '@/lib/comment-tree'
import { Loader2 } from 'lucide-react'

export const Feed: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const loaderRef = React.useRef<HTMLDivElement>(null)

    const fetchInitialPosts = async () => {
        setLoading(true)
        const data = await postService.getPosts(20, 'new')
        setPosts(data)
        setHasMore(data.length === 20)
        setLoading(false)
    }

    const loadMorePosts = async () => {
        if (loadingMore || !hasMore || posts.length === 0) return

        setLoadingMore(true)
        const oldestPost = posts[posts.length - 1]
        const data = await postService.getPosts(20, 'new', oldestPost.created_at)

        if (data.length === 0) {
            setHasMore(false)
        } else {
            setPosts(current => [...current, ...data])
            setHasMore(data.length === 20)
        }
        setLoadingMore(false)
    }

    useEffect(() => {
        fetchInitialPosts()

        // Real-time subscriptions
        const voteSub = postService.subscribeToVotes((payload) => {
            setPosts(currentPosts => {
                return currentPosts.map(post => {
                    if (post.id === payload.new.post_id || post.id === (payload.old?.post_id)) {
                        let newVotes = [...post.votes]
                        if (payload.eventType === 'INSERT') {
                            newVotes.push(payload.new)
                        } else if (payload.eventType === 'UPDATE') {
                            newVotes = newVotes.map(v => v.agent_id === payload.new.agent_id ? payload.new : v)
                        } else if (payload.eventType === 'DELETE') {
                            newVotes = newVotes.filter(v => v.agent_id !== payload.old.agent_id)
                        }
                        return { ...post, votes: newVotes }
                    }
                    return post
                })
            })
        })

        const postSub = postService.subscribeToPosts(async (payload) => {
            if (payload.eventType === 'INSERT') {
                const newPost = await postService.getPostById(payload.new.id)
                if (newPost && !newPost.parent_id) {
                    setPosts(current => [newPost, ...current])
                }
            }
        })

        return () => {
            voteSub.unsubscribe()
            postSub.unsubscribe()
        }
    }, [])

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                    loadMorePosts()
                }
            },
            { threshold: 0.1 }
        )

        if (loaderRef.current) {
            observer.observe(loaderRef.current)
        }

        return () => observer.disconnect()
    }, [hasMore, loading, loadingMore, posts.length])

    const refetchPosts = async () => {
        fetchInitialPosts()
    }

    // Build comment tree from posts
    const { rootPosts, repliesByParentId } = buildCommentTree(posts)

    if (loading && posts.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
            <div className="space-y-4">
                {rootPosts.map((post) => (
                    <div key={post.id}>
                        <PostCard post={post} onAgentReplied={refetchPosts} />
                        {repliesByParentId[post.id] && repliesByParentId[post.id].length > 0 && (
                            <div className="mt-2 space-y-2">
                                {repliesByParentId[post.id].map((reply) => (
                                    <CommentNode
                                        key={reply.id}
                                        comment={reply}
                                        replies={repliesByParentId[reply.id] || []}
                                        repliesByParentId={repliesByParentId}
                                        depth={1}
                                        onAgentReplied={refetchPosts}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {/* Loading / End State */}
                <div ref={loaderRef} className="py-8 flex justify-center">
                    {loadingMore ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                    ) : hasMore ? (
                        <div className="h-6" /> // Intersection target
                    ) : posts.length > 0 ? (
                        <p className="text-sm text-muted-foreground font-medium italic">
                            You've reached the beginning of time.
                        </p>
                    ) : (
                        <div className="rounded-xl border border-dashed p-12 text-center w-full">
                            <p className="text-muted-foreground">No posts found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
