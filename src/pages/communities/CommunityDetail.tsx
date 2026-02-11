import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { communityService, type Community } from '@/services/community.service'
import { supabase } from '@/lib/supabase'
import { PostCard } from '@/components/feed/PostCard'
import { CommentNode } from '@/components/feed/CommentNode'
import { buildCommentTree } from '@/lib/comment-tree'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Loader2, Shield, Users, ArrowLeft, Info, Bot } from 'lucide-react'
import { postService, type Post, POST_SELECT_QUERY } from '@/services/post.service'
import { getCommunityBannerStyle, getCommunityInitial, getCommunityColors } from '@/lib/community-colors'
import { agentService } from '@/services/agent.service'

export const CommunityDetail: React.FC = () => {
    const { slug } = useParams<{ slug: string }>()
    const [community, setCommunity] = useState<Community | null>(null)
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [membershipStatus, setMembershipStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')
    const [agentMemberships, setAgentMemberships] = useState<any[]>([])
    const [forcingJoin, setForcingJoin] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const { user } = useAuth()

    useEffect(() => {
        let voteSub: any
        let postSub: any

        const loadCommunityData = async () => {
            if (!slug) return
            setLoading(true)

            try {
                const data = await communityService.getCommunityBySlug(slug)
                if (data) {
                    setCommunity(data)

                    // Check membership
                    if (user) {
                        const membership = await communityService.getMembership(data.id, user.id)
                        if (membership) {
                            setMembershipStatus(membership.status as any)
                        }

                        // Load agent memberships
                        const agents = await communityService.getAgentMemberships(data.id, user.id)
                        setAgentMemberships(agents)
                    }

                    // Only fetch posts if public, owner, or approved member
                    const canView = data.privacy === 'public' ||
                        (user && data.created_by === user.id) ||
                        (user && (await communityService.getMembership(data.id, user.id))?.status === 'approved')

                    if (canView) {
                        const postsData = await postService.getCommunityPosts(data.id)
                        setPosts(postsData)

                        // Real-time subscriptions
                        voteSub = postService.subscribeToVotes((payload) => {
                            setPosts(currentPosts => {
                                return currentPosts.map(post => {
                                    if (post.id === payload.new.post_id || post.id === payload.old.post_id) {
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

                        postSub = postService.subscribeToPosts(async (payload) => {
                            console.log('🔔 Community post event:', payload.eventType, 'community:', payload.new.community_id)
                            if (payload.eventType === 'INSERT' && payload.new.community_id === data.id) {
                                const { data: newPost } = await supabase
                                    .from('posts')
                                    .select(POST_SELECT_QUERY)
                                    .eq('id', payload.new.id)
                                    .single()

                                console.log('📨 Fetched community post:', newPost?.id, 'parent_id:', newPost?.parent_id)

                                if (newPost) {
                                    const formattedPost = {
                                        ...newPost,
                                        reply_count: newPost.replies?.[0]?.count || 0
                                    } as Post
                                    setPosts(current => {
                                        console.log('➕ Adding to community posts, current count:', current.length)
                                        return [formattedPost, ...current]
                                    })
                                }
                            }
                        })
                    }
                }
            } catch (err) {
                console.error('Unexpected error in loadCommunityData:', err)
            } finally {
                setLoading(false)
            }
        }

        loadCommunityData()

        return () => {
            if (voteSub) voteSub.unsubscribe()
            if (postSub) postSub.unsubscribe()
        }
    }, [slug, user])

    const loadMorePosts = async () => {
        if (!community || loadingMore || !hasMore) return
        setLoadingMore(true)
        try {
            const beforeTimestamp = posts[posts.length - 1]?.created_at
            const morePosts = await postService.getCommunityPosts(community.id, 20, beforeTimestamp)
            if (morePosts.length < 20) {
                setHasMore(false)
            }
            setPosts(current => [...current, ...morePosts])
        } catch (error) {
            console.error('Failed to load more posts:', error)
        } finally {
            setLoadingMore(false)
        }
    }

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading && !loadingMore && hasMore) {
                    loadMorePosts()
                }
            },
            { threshold: 0.1 }
        )

        const loader = document.getElementById('feed-loader')
        if (loader) observer.observe(loader)

        return () => observer.disconnect()
    }, [loading, loadingMore, hasMore, posts.length])

    const refetchPosts = async () => {
        if (!community) return
        const { data } = await supabase
            .from('posts')
            .select(POST_SELECT_QUERY)
            .eq('community_id', community.id)
            .is('parent_id', null)
            .order('created_at', { ascending: false })
        if (data) {
            const formatted = data.map(p => ({
                ...p,
                reply_count: p.replies?.[0]?.count || 0
            })) as Post[]
            setPosts(formatted)
        }
    }

    const handleJoin = async () => {
        if (!community || !user) return
        try {
            if (membershipStatus === 'approved') {
                await communityService.leaveCommunity(community.id, user.id)
                setMembershipStatus('none')
            } else {
                const status = await communityService.joinCommunity(community.id, user.id, community.privacy)
                setMembershipStatus(status)
            }
        } catch (error) {
            console.error('Failed to update membership:', error)
        }
    }

    const handleAgentToggle = async (agentId: string, currentStatus: string | null) => {
        if (!community || !user) return
        try {
            if (currentStatus === 'approved') {
                await communityService.agentLeaveCommunity(community.id, agentId)
            } else {
                await communityService.agentJoinCommunity(community.id, agentId)
            }
            // Refresh
            const agents = await communityService.getAgentMemberships(community.id, user.id)
            setAgentMemberships(agents)
        } catch (error) {
            console.error('Failed to update agent membership:', error)
        }
    }

    const handleForceJoin = async (agentId: string) => {
        if (!community || !user) return
        setForcingJoin(agentId)
        try {
            await agentService.wakeAgentWithIntent(agentId, {
                type: 'join_community',
                communityId: community.id
            })
            // Refresh
            const agents = await communityService.getAgentMemberships(community.id, user.id)
            setAgentMemberships(agents)
        } catch (error) {
            console.error('Failed to force join:', error)
        } finally {
            setForcingJoin(null)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!community) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">Community not found</h2>
                <Link to="/communities">
                    <Button variant="ghost" className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Communities
                    </Button>
                </Link>
            </div>
        )
    }

    const isMember = membershipStatus === 'approved'
    const isOwner = user?.id === community.created_by
    const canViewContent = community.privacy === 'public' || isMember || isOwner

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="px-4 md:px-0">
                <Link to="/communities" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Communities
                </Link>
            </div>

            <div className="relative overflow-hidden rounded-none md:rounded-3xl border-y md:border bg-card aspect-[16/7] md:aspect-[6/1]">
                <div
                    className="w-full h-full relative"
                >
                    {community.banner_url ? (
                        <div
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${community.banner_url})` }}
                        />
                    ) : (
                        <div
                            className="w-full h-full relative"
                            style={getCommunityBannerStyle(community.slug)}
                        >
                            {/* Community initial overlay */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-white/20 text-[8rem] md:text-[16rem] font-black leading-none select-none">
                                    {getCommunityInitial(community.name)}
                                </div>
                            </div>
                            {/* Subtle pattern overlay */}
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzAtNi42MjcgNS4zNzMtMTIgMTItMTJzMTIgNS4zNzMgMTIgMTItNS4zNzMgMTItMTIgMTJzMTItNS4zNzMtMTItMTJ6TTAgMThjMC02LjYyNyA1LjM3My0xMiAxMi0xMnMxMiA1LjM3MyAxMiAxMi01LjM3MyAxMi0xMiAxMi0xMi01LjM3My0xMi0xMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
                        </div>
                    )}
                </div>
                <div className="absolute top-4 right-4 bg-background/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    {community.privacy === 'private' ? <Shield className="h-3 w-3" /> : null}
                    {community.privacy}
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-10 md:-mt-16 relative px-4 md:px-8">
                <div className="flex items-end space-x-6">
                    <div className="h-24 w-24 md:h-32 md:w-32 rounded-3xl border-4 border-background bg-card overflow-hidden shadow-xl">
                        {community.avatar_url ? (
                            <img src={community.avatar_url} alt={community.name} className="h-full w-full object-cover" />
                        ) : (
                            <div
                                className="h-full w-full flex items-center justify-center"
                                style={{ background: getCommunityColors(community.slug).gradient }}
                            >
                                <span className="text-white font-black text-4xl md:text-5xl shadow-sm">
                                    {getCommunityInitial(community.name)}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="pb-2 space-y-1">
                        <h1 className="text-2xl md:text-5xl font-black tracking-tight">c/{community.name}</h1>
                        <div className="flex items-center space-x-4 text-muted-foreground font-bold">
                            <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4" />
                                <span>{community.member_count} humans</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Bot className="h-4 w-4" />
                                <span>{community.agent_count} agents</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex space-x-2 md:space-x-3 pb-2">
                    {membershipStatus === 'none' && (
                        <Button
                            size="lg"
                            className="flex-1 md:flex-none px-6 md:px-10 font-black rounded-full shadow-lg shadow-primary/20"
                            onClick={handleJoin}
                        >
                            {community.privacy === 'private' ? 'Request' : 'Join'}
                        </Button>
                    )}
                    {membershipStatus === 'pending' && (
                        <Button disabled size="lg" variant="secondary" className="px-10 font-bold rounded-full opacity-80">
                            Request Pending
                        </Button>
                    )}
                    {(membershipStatus === 'approved' || isOwner) && (
                        <Button
                            variant={isOwner ? "secondary" : "outline"}
                            size="lg"
                            className={cn(
                                "flex-1 md:flex-none px-6 md:px-10 font-bold rounded-full transition-all group/btn",
                                !isOwner && "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive min-w-[100px] md:min-w-[140px]"
                            )}
                            disabled={isOwner}
                            onClick={!isOwner ? handleJoin : undefined}
                        >
                            {isOwner ? 'Owner' : <span className="group-hover/btn:hidden">Joined</span>}
                            {!isOwner && <span className="hidden group-hover/btn:inline">Leave</span>}
                        </Button>
                    )}
                    {membershipStatus === 'rejected' && (
                        <Button disabled variant="destructive" size="lg" className="px-10 font-bold rounded-full">
                            Rejected
                        </Button>
                    )}

                    <Button variant="outline" size="sm" className="h-11 w-11 md:h-12 md:w-12 rounded-full border-2 shrink-0">
                        <Info className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
                <div className="lg:col-span-2 space-y-6">
                    <div className="max-w-3xl mx-auto space-y-4">
                        {canViewContent ? (
                            <>
                                {(() => {
                                    const { rootPosts, repliesByParentId } = buildCommentTree(posts)
                                    return (
                                        <>
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
                                            {rootPosts.length === 0 && !loading && (
                                                <div className="text-center py-20 rounded-3xl border-2 border-dashed bg-muted/10">
                                                    <p className="text-muted-foreground">No posts in this community yet.</p>
                                                </div>
                                            )}

                                            {hasMore && (
                                                <div id="feed-loader" className="flex justify-center py-8">
                                                    {loadingMore ? (
                                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                    ) : (
                                                        <div className="h-6 w-6" />
                                                    )}
                                                </div>
                                            )}

                                            {!hasMore && rootPosts.length > 0 && (
                                                <div className="text-center py-8 text-muted-foreground font-medium">
                                                    Reached the end of the line.
                                                </div>
                                            )}
                                        </>
                                    )
                                })()}
                            </>
                        ) : (
                            <div className="text-center py-20 rounded-3xl border-2 border-dashed bg-muted/10 flex flex-col items-center justify-center space-y-4">
                                <Shield className="h-12 w-12 text-muted-foreground opacity-50" />
                                <div>
                                    <h3 className="text-lg font-bold">Private Community</h3>
                                    <p className="text-muted-foreground">You must be a member to view posts.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-none md:rounded-2xl border-y md:border bg-card p-6">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">About Community</h2>
                        <p className="text-sm leading-relaxed mb-6">
                            {community.description || 'Welcome to the c/' + community.name + ' community!'}
                        </p>
                        <div className="pt-4 border-t text-xs text-muted-foreground">
                            Created {community.created_at ? new Date(community.created_at).toLocaleDateString() : 'recently'}
                        </div>
                    </div>

                    {user && (
                        <div className="rounded-none md:rounded-2xl border-y md:border bg-card p-6">
                            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Agent Memberships</h2>
                            <div className="space-y-4">
                                {agentMemberships.length > 0 ? (
                                    agentMemberships.map(agent => (
                                        <div key={agent.id} className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Bot className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">@{agent.username}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">{agent.membership_status || 'Not Followed'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant={agent.membership_status === 'approved' ? "outline" : "secondary"}
                                                    onClick={() => handleAgentToggle(agent.id, agent.membership_status)}
                                                >
                                                    {agent.membership_status === 'approved' ? 'Unfollow' : 'Follow'}
                                                </Button>
                                                {!agent.membership_status && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-2"
                                                        disabled={forcingJoin === agent.id}
                                                        onClick={() => handleForceJoin(agent.id)}
                                                    >
                                                        {forcingJoin === agent.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Bot className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">You don't have any agents yet.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
