import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { postService, type Post } from '@/services/post.service'
import { profileService, type Profile } from '@/services/profile.service'
import { Loader2, MessageSquare, Edit3, Camera, Save, Calendar, Image as ImageIcon, MessageCircle, Heart, Users } from 'lucide-react'
import { ActivityItem } from '@/components/agent/ActivityItem'
import { FollowsModal } from '@/components/profile/FollowsModal'
import { FollowButton } from '@/components/agent/FollowButton'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { toast } from 'sonner'
import { storageService } from '@/services/storage.service'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { extractDominantColor, getUserInitial } from '@/lib/image-color-extractor'
import { getCommunityColors } from '@/lib/community-colors'

export const ProfilePage: React.FC = () => {
    const { user } = useAuth()
    const { userId } = useParams<{ userId?: string }>()
    const effectiveUserId = userId || user?.id
    const isOwner = user && (!userId || userId === user.id)

    const [profile, setProfile] = useState<Profile | null>(null)
    const [posts, setPosts] = useState<Post[]>([])
    const [activity, setActivity] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = (searchParams.get('tab') as 'posts' | 'media') || 'posts'

    const setActiveTab = (tab: string) => {
        setSearchParams({ tab })
    }
    const [isFollowsModalOpen, setIsFollowsModalOpen] = useState(false)
    const [followsModalTab, setFollowsModalTab] = useState<'followers' | 'following'>('followers')
    const [stats, setStats] = useState({ totalVotes: 0, postCount: 0, commentCount: 0, followers: 0, following: 0 })
    const [followers, setFollowers] = useState<any[]>([])
    const [following, setFollowing] = useState<any[]>([])
    const [bannerGradient, setBannerGradient] = useState<string>('')
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            if (effectiveUserId) {
                setLoading(true)
                try {
                    // 1. Resolve profile first (could be UUID or username)
                    const profileData = await profileService.getProfileByIdOrUsername(effectiveUserId)

                    if (!profileData) {
                        setProfile(null)
                        setLoading(false)
                        return
                    }

                    setProfile(profileData)
                    const userId = profileData.id // Guaranteed UUID

                    // 2. Load other data using the UUID
                    const [postsData, votesData, statsData, followersData, followingData] = await Promise.all([
                        postService.getUserPosts(userId),
                        postService.getUserVoteActivity(userId),
                        profileService.getProfileStats(userId),
                        profileService.getFollows(userId, 'user', 'followers'),
                        profileService.getFollows(userId, 'user', 'following')
                    ])

                    setPosts(postsData)
                    setStats(statsData)
                    setFollowers(followersData)
                    setFollowing(followingData)

                    // Combine posts and votes into unified activity feed (matching getAgentActivity format)
                    const combinedActivity = [
                        ...postsData.map(p => ({
                            type: p.parent_id ? 'reply' : 'post',
                            date: new Date(p.created_at),
                            data: { ...p, reply_count: p.reply_count || 0 }
                        })),
                        ...votesData.map(v => ({
                            type: v.vote_type === 'up' ? 'upvote' : 'downvote',
                            date: new Date(v.created_at),
                            data: v.post
                        }))
                    ].sort((a, b) => b.date.getTime() - a.date.getTime())
                    setActivity(combinedActivity)

                    // Extract color from avatar
                    if (profileData?.avatar_url) {
                        const colors = await extractDominantColor(profileData.avatar_url)
                        if (colors) {
                            setBannerGradient(colors.gradient)
                        } else {
                            // Fallback to hash-based solid color
                            const fallbackColors = getCommunityColors(profileData.username || 'user')
                            setBannerGradient(fallbackColors.primary)
                        }
                    } else {
                        // No avatar - use hash-based solid color
                        const fallbackColors = getCommunityColors(profileData?.username || 'user')
                        setBannerGradient(fallbackColors.primary)
                    }
                } catch (error) {
                    console.error('Error loading profile data:', error)
                    toast.error('Failed to load profile data')
                } finally {
                    setLoading(false)
                }
            }
        }
        loadData()
    }, [effectiveUserId])

    const loadMoreActivity = async () => {
        if (!profile || loadingMore || !hasMore) return
        setLoadingMore(true)
        try {
            const oldestActivity = activity[activity.length - 1]
            const beforeTimestamp = oldestActivity?.date?.toISOString() || new Date().toISOString()

            const [postsData, votesData] = await Promise.all([
                postService.getUserPosts(profile.id, 20, beforeTimestamp),
                postService.getUserVoteActivity(profile.id, 20, beforeTimestamp)
            ])

            if (postsData.length < 20 && votesData.length < 20) {
                setHasMore(false)
            }

            const newActivity = [
                ...postsData.map(p => ({
                    type: p.parent_id ? 'reply' : 'post',
                    date: new Date(p.created_at),
                    data: { ...p, reply_count: p.reply_count || 0 }
                })),
                ...votesData.map(v => ({
                    type: v.vote_type === 'up' ? 'upvote' : 'downvote',
                    date: new Date(v.created_at),
                    data: v.post
                }))
            ].sort((a, b) => b.date.getTime() - a.date.getTime())

            if (newActivity.length === 0) {
                setHasMore(false)
            }

            setActivity(current => [...current, ...newActivity])
            setPosts(current => [...current, ...postsData])
        } catch (error) {
            console.error('Error loading more activity:', error)
        } finally {
            setLoadingMore(false)
        }
    }

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading && !loadingMore && hasMore) {
                    loadMoreActivity()
                }
            },
            { threshold: 0.1 }
        )

        const loader = document.getElementById('profile-activity-loader') || document.getElementById('profile-media-loader')
        if (loader) observer.observe(loader)

        return () => observer.disconnect()
    }, [loading, loadingMore, hasMore, activity.length, activeTab])

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const EditProfileModal = () => {
        const [username, setUsername] = useState(profile?.username || '')
        const [bio, setBio] = useState(profile?.bio || '')
        const [isSaving, setIsSaving] = useState(false)
        const [isUploading, setIsUploading] = useState(false)

        const handleSave = async () => {
            if (!user) return
            setIsSaving(true)
            try {
                await profileService.updateProfile(user.id, { username, bio })

                // Fetch updated profile to get new change count/timestamp
                const updatedProfile = await profileService.getProfile(user.id)
                setProfile(updatedProfile)

                toast.success('Profile updated!')
                setIsEditModalOpen(false)
            } catch (error: any) {
                console.error('Update error:', error)
                toast.error(error.message || 'Failed to update profile')
            } finally {
                setIsSaving(false)
            }
        }

        const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0]
            if (!file || !user) return
            setIsUploading(true)
            try {
                const url = await storageService.uploadAvatar(user.id, file)
                await profileService.updateProfile(user.id, { avatar_url: url })
                setProfile(prev => prev ? { ...prev, avatar_url: url } : null)

                // Extract color from new avatar
                const colors = await extractDominantColor(url)
                if (colors) {
                    setBannerGradient(colors.gradient)
                }

                toast.success('Photo updated!')
            } catch (error: any) {
                console.error('Upload error:', error)
                toast.error(error.message || 'Upload failed')
            } finally {
                setIsUploading(false)
            }
        }

        return (
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
                    <div className="relative h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
                    <div className="px-8 pb-8 -mt-12 space-y-8 text-foreground">
                        <div className="flex items-end justify-between">
                            <div className="relative group">
                                <div className="h-28 w-28 rounded-[2rem] bg-card overflow-hidden border-4 border-background shadow-xl">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-primary text-3xl font-black bg-primary/5">
                                            {username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        </div>
                                    )}
                                </div>
                                <input type="file" id="avatar-input-modal" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                                <label htmlFor="avatar-input-modal" className="absolute -bottom-1 -right-1 p-2.5 rounded-2xl bg-primary text-primary-foreground shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all ring-4 ring-background">
                                    <Camera className="h-5 w-5" />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <DialogTitle className="text-3xl font-black tracking-tight text-foreground">Edit Profile</DialogTitle>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Username</label>
                                        <div className="flex items-center space-x-3">
                                            {profile?.username !== username && (
                                                <span className="text-[10px] font-black text-primary uppercase">
                                                    {(2 - (profile?.username_change_count || 0))} changes left this quarter
                                                </span>
                                            )}
                                            <span className={cn("text-[10px] font-bold", username.length > 20 ? "text-destructive" : "text-muted-foreground")}>
                                                {username.length}/25
                                            </span>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={25}
                                        className="w-full px-6 py-4 rounded-2xl border bg-muted/30 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-lg text-foreground"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Choose a cool username"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Bio</label>
                                        <span className={cn("text-[10px] font-bold", bio.length > 150 ? "text-destructive" : "text-muted-foreground")}>
                                            {bio.length}/160
                                        </span>
                                    </div>
                                    <textarea
                                        maxLength={160}
                                        className="w-full px-6 py-4 rounded-2xl border bg-muted/30 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium min-h-[120px] resize-none text-base text-foreground"
                                        placeholder="Tell the community about yourself..."
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-4 pt-4">
                            <Button variant="ghost" className="flex-1 h-14 font-bold rounded-2xl text-muted-foreground" onClick={() => setIsEditModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 h-14 font-bold rounded-2xl shadow-xl shadow-primary/20 text-lg"
                                onClick={handleSave}
                                disabled={isSaving || !username.trim()}
                            >
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Save className="h-5 w-5 mr-3" />}
                                Save Profile
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return
        toast.info('Uploading photo...')
        try {
            const url = await storageService.uploadAvatar(user.id, file)
            await profileService.updateProfile(user.id, { avatar_url: url })
            setProfile(prev => prev ? { ...prev, avatar_url: url } : null)

            // Extract color from new avatar
            const colors = await extractDominantColor(url)
            if (colors) {
                setBannerGradient(colors.gradient)
                toast.success('Photo updated with new banner colors!')
            } else {
                toast.success('Photo updated!')
            }
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || 'Upload failed')
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Redesigned Profile Header */}
            <div className="relative overflow-hidden rounded-[3rem] border bg-card shadow-xl group">
                {/* Cover Area with Extracted Color */}
                <div
                    className="h-48 relative overflow-hidden"
                    style={{ background: bannerGradient || 'linear-gradient(135deg, hsl(220, 80%, 60%) 0%, hsl(250, 75%, 65%) 50%, hsl(280, 80%, 70%) 100%)' }}
                >
                    {/* User initial overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white/10 text-[10rem] font-black leading-none select-none">
                            {getUserInitial(profile?.username, user?.email)}
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                <div className="px-8 pb-8">
                    <div className="relative flex flex-col md:flex-row items-center md:items-end -mt-16 mb-8 gap-6">
                        <div className="relative group/avatar">
                            <div className="h-40 w-40 rounded-[2.5rem] bg-card overflow-hidden border-[6px] border-background shadow-2xl ring-1 ring-black/5">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover transition-transform group-hover/avatar:scale-105 duration-500" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-primary text-5xl font-black bg-primary/5">
                                        {profile?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <input type="file" id="avatar-input-main" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            <label htmlFor="avatar-input-main" className="absolute bottom-2 right-2 p-3 rounded-2xl bg-primary text-primary-foreground shadow-xl cursor-pointer opacity-0 group-hover/avatar:opacity-100 transition-all hover:scale-110 active:scale-90 ring-4 ring-background">
                                <Camera className="h-5 w-5" />
                            </label>
                        </div>

                        <div className="flex-1 space-y-4 text-center md:text-left pt-4">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="space-y-1">
                                    <div className="flex items-center justify-center md:justify-start gap-3">
                                        <h1 className="text-5xl font-black tracking-tighter text-foreground">{profile?.username || user?.email?.split('@')[0]}</h1>
                                    </div>
                                    <p className="text-lg font-bold text-muted-foreground/60">{isOwner ? user?.email : ''}</p>
                                </div>
                                {isOwner ? (
                                    <Button
                                        variant="outline"
                                        className="rounded-[1.25rem] font-black h-14 px-8 border-2 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all text-base bg-background"
                                        onClick={() => setIsEditModalOpen(true)}
                                    >
                                        <Edit3 className="h-5 w-5 mr-3" />
                                        Edit Profile
                                    </Button>
                                ) : (
                                    <div className="flex items-center h-14">
                                        <FollowButton
                                            followingId={effectiveUserId!}
                                            followingType="user"
                                            onToggle={async () => {
                                                // Refresh follower/following stats and lists
                                                if (effectiveUserId) {
                                                    const [statsData, followersData, followingData] = await Promise.all([
                                                        profileService.getProfileStats(effectiveUserId),
                                                        profileService.getFollows(effectiveUserId, 'user', 'followers'),
                                                        profileService.getFollows(effectiveUserId, 'user', 'following')
                                                    ])
                                                    setStats(statsData)
                                                    setFollowers(followersData)
                                                    setFollowing(followingData)
                                                }
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                        {/* Bio and Info */}
                        <div className="md:col-span-2 space-y-6 text-foreground">
                            {profile?.bio && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/50">About</h3>
                                    <p className="text-xl font-medium text-foreground/90 leading-relaxed italic">
                                        "{profile.bio}"
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center space-x-2 px-4 py-2 rounded-2xl bg-muted/40 border-none text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-sm font-bold">Joined {profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'Recently'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Card */}
                        <div className="bg-muted/30 rounded-[2rem] p-6 grid grid-cols-2 gap-4 text-foreground w-full md:w-auto">
                            <div className="space-y-1 p-2 text-center md:text-left cursor-pointer hover:bg-muted/50 rounded-xl transition-colors"
                                onClick={() => {
                                    setFollowsModalTab('followers');
                                    setIsFollowsModalOpen(true);
                                }}>
                                <div className="flex items-center justify-center md:justify-start space-x-2 text-primary font-black mb-1">
                                    <Users className="h-3 w-3" />
                                    <span className="text-[8px] uppercase tracking-widest">Followers</span>
                                </div>
                                <p className="text-2xl font-black tabular-nums">{stats.followers}</p>
                            </div>
                            <div className="space-y-1 p-2 text-center md:text-left cursor-pointer hover:bg-muted/50 rounded-xl transition-colors"
                                onClick={() => {
                                    setFollowsModalTab('following');
                                    setIsFollowsModalOpen(true);
                                }}>
                                <div className="flex items-center justify-center md:justify-start space-x-2 text-primary font-black mb-1">
                                    <Users className="h-3 w-3" />
                                    <span className="text-[8px] uppercase tracking-widest">Following</span>
                                </div>
                                <p className="text-2xl font-black tabular-nums">{stats.following}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <EditProfileModal />

            {/* Post Tabs */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2 border-b">
                    <div className="flex items-center space-x-8">
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={cn(
                                "text-sm font-black uppercase tracking-widest transition-all relative py-4",
                                activeTab === 'posts' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Activity
                        </button>
                        <button
                            onClick={() => setActiveTab('media')}
                            className={cn(
                                "text-sm font-black uppercase tracking-widest transition-all relative py-4",
                                activeTab === 'media' ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Media
                        </button>
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'posts' ? (
                        <div className="space-y-8">
                            {/* Stats Highlight */}
                            <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4 bg-muted/20 p-6 rounded-[2.5rem] border border-muted/30">
                                <div className="text-center space-y-1">
                                    <div className="flex items-center justify-center space-x-2 text-primary opacity-60 font-black">
                                        <MessageCircle className="h-3 w-3" />
                                        <span className="text-[8px] uppercase tracking-widest">Activity</span>
                                    </div>
                                    <p className="text-3xl font-black tabular-nums">{stats.postCount}</p>
                                </div>
                                <div className="text-center space-y-1 border-x border-muted/30">
                                    <div className="flex items-center justify-center space-x-2 text-primary opacity-60 font-black">
                                        <MessageSquare className="h-3 w-3" />
                                        <span className="text-[8px] uppercase tracking-widest">Replies</span>
                                    </div>
                                    <p className="text-3xl font-black tabular-nums">{stats.commentCount}</p>
                                </div>
                                <div className="text-center space-y-1">
                                    <div className="flex items-center justify-center space-x-2 text-rose-500 opacity-60 font-black">
                                        <Heart className="h-3 w-3" />
                                        <span className="text-[8px] uppercase tracking-widest">Karma</span>
                                    </div>
                                    <p className="text-3xl font-black tabular-nums">{stats.totalVotes}</p>
                                </div>
                            </div>

                            {activity.length > 0 ? (
                                <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
                                    {activity.map((item, idx) => (
                                        <ActivityItem
                                            key={`${item.type}-${item.data?.id || idx}-${item.date?.getTime()}`}
                                            item={item}
                                        />
                                    ))}

                                    {hasMore && (
                                        <div id="profile-activity-loader" className="flex justify-center py-8">
                                            {loadingMore ? (
                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            ) : (
                                                <div className="h-6 w-6" />
                                            )}
                                        </div>
                                    )}

                                    {!hasMore && activity.length > 0 && (
                                        <div className="text-center py-8 text-muted-foreground font-medium">
                                            End of activity.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-card border-none rounded-[3rem] p-20 text-center space-y-6 shadow-sm ring-1 ring-black/5 text-foreground max-w-3xl mx-auto">
                                    <div className="h-24 w-24 bg-primary/5 rounded-[2rem] flex items-center justify-center mx-auto ring-8 ring-primary/[0.02]">
                                        <MessageSquare className="h-10 w-10 text-primary opacity-40" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-2xl font-black tracking-tight text-foreground">No activity yet</p>
                                        <p className="text-muted-foreground font-medium max-w-xs mx-auto">Your posts and votes will appear here.</p>
                                    </div>
                                    <Button className="rounded-2xl font-black px-8">Create First Post</Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {posts.filter(p => p.post_type === 'image').map(post => (
                                <div key={post.id} className="aspect-square rounded-3xl overflow-hidden border-4 border-background shadow-md hover:scale-105 transition-transform group relative">
                                    <img src={post.media_url || undefined} className="w-full h-full object-cover" alt="Media" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <ImageIcon className="h-8 w-8 text-white" />
                                    </div>
                                </div>
                            ))}
                            {posts.filter(p => p.post_type === 'image').length === 0 && (
                                <div className="col-span-full py-20 text-center grayscale opacity-50 text-foreground">
                                    <p className="font-bold">No media found</p>
                                </div>
                            )}

                            {hasMore && (
                                <div id="profile-media-loader" className="col-span-full flex justify-center py-8">
                                    {loadingMore ? (
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    ) : (
                                        <div className="h-6 w-6" />
                                    )}
                                </div>
                            )}

                            {!hasMore && posts.filter(p => p.post_type === 'image').length > 0 && (
                                <div className="col-span-full text-center py-8 text-muted-foreground font-medium">
                                    End of media.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <FollowsModal
                    isOpen={isFollowsModalOpen}
                    onClose={() => setIsFollowsModalOpen(false)}
                    followers={followers}
                    following={following}
                    initialTab={followsModalTab}
                    entityName={profile?.username || 'User'}
                />
            </div>
        </div>
    )
}
