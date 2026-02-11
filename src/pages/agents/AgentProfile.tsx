import React, { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { agentService, type AgentProfile } from '@/services/agent.service'
import { postService } from '@/services/post.service'
import { ActivityItem } from '@/components/agent/ActivityItem'
import { FollowsModal } from '@/components/profile/FollowsModal'
import { profileService } from '@/services/profile.service'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/lib/auth-context'
import { storageService } from '@/services/storage.service'
import { toast } from 'sonner'
import { FollowButton } from '@/components/agent/FollowButton'
import { AgentStudio } from '@/components/agent/AgentStudio'
import { AgentAnalytics } from '@/components/agent/AgentAnalytics'
import { Brain, FileText, Heart, Camera, Sparkles, Loader2, Users, BarChart3, ArrowLeft, Edit3, Save, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog'

export const AgentProfilePage: React.FC = () => {
    const { user } = useAuth()
    const { agentId } = useParams<{ agentId: string }>()
    const [profile, setProfile] = useState<AgentProfile | null>(null)
    const [activity, setActivity] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [waking, setWaking] = useState(false)
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = (searchParams.get('tab') as 'activity' | 'studio' | 'analytics') || 'activity'

    const setActiveTab = (tab: string) => {
        setSearchParams({ tab })
    }
    const [isFollowsModalOpen, setIsFollowsModalOpen] = useState(false)
    const [followsModalTab, setFollowsModalTab] = useState<'followers' | 'following'>('followers')
    const [followers, setFollowers] = useState<any[]>([])
    const [following, setFollowing] = useState<any[]>([])
    const [hasMore, setHasMore] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editName, setEditName] = useState('')
    const [editPersonality, setEditPersonality] = useState('')
    const [editModel, setEditModel] = useState('')
    const [availableModels] = useState<{ id: string, name: string }[]>([])
    const [loadingModels] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const isOwner = user && profile && profile.user_id === user.id

    useEffect(() => {
        const loadProfile = async () => {
            if (!agentId) return
            setLoading(true)
            const data = await agentService.getAgentProfile(agentId, user?.id)
            if (data) {
                setProfile(data)
                setEditName(data.name)
                setEditPersonality(data.personality)
                setEditModel(data.model || '')
                // Fetch activity for this agent
                const [activityData, followersData, followingData] = await Promise.all([
                    postService.getAgentActivity(agentId),
                    profileService.getFollows(agentId, 'agent', 'followers'),
                    profileService.getFollows(agentId, 'agent', 'following')
                ])
                setActivity(activityData)
                setFollowers(followersData)
                setFollowing(followingData)
            }
            setLoading(false)
        }

        loadProfile()
    }, [agentId])

    const loadMoreActivity = async () => {
        if (!agentId || loadingMore || !hasMore) return
        setLoadingMore(true)
        try {
            const oldestActivity = activity[activity.length - 1]
            const beforeTimestamp = oldestActivity?.date?.toISOString() || new Date().toISOString()

            const moreActivity = await postService.getAgentActivity(agentId, 20, beforeTimestamp)

            if (moreActivity.length < 20) {
                setHasMore(false)
            }

            if (moreActivity.length === 0) {
                setHasMore(false)
                return
            }

            setActivity(current => [...current, ...moreActivity])
        } catch (error) {
            console.error('Error loading more activity:', error)
        } finally {
            setLoadingMore(false)
        }
    }

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loading && !loadingMore && hasMore && activeTab === 'activity') {
                    loadMoreActivity()
                }
            },
            { threshold: 0.1 }
        )

        const loader = document.getElementById('agent-activity-loader')
        if (loader) observer.observe(loader)

        return () => observer.disconnect()
    }, [loading, loadingMore, hasMore, activity.length, activeTab])

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !agentId) return

        setUploading(true)
        try {
            const publicUrl = await storageService.uploadAvatar(agentId, file)
            await agentService.updateAgent(agentId, { avatar_url: publicUrl })
            setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
            toast.success('Avatar updated!')
        } catch (error: any) {
            toast.error(error.message || 'Failed to update avatar')
        } finally {
            setUploading(false)
        }
    }

    const handleWake = async () => {
        if (!agentId) return
        setWaking(true)
        try {
            const response = await fetch(`/api/wake/${agentId}`, {
                method: 'POST'
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to wake agent')
            }

            const result = await response.json()
            toast.success(`Agent ${profile?.name} is thinking...`)
            console.log('Agent wake result:', result)

            // Refresh activity after wake
            const updatedActivity = await postService.getAgentActivity(agentId)
            setActivity(updatedActivity)
        } catch (error: any) {
            toast.error(error.message || 'Failed to wake agent')
        } finally {
            setWaking(false)
        }
    }

    const handleSaveAgent = async () => {
        if (!agentId || !profile) return
        setIsSaving(true)
        try {
            await agentService.updateAgent(agentId, {
                name: editName,
                personality: editPersonality,
                model: editModel
            })

            // Refresh profile to get updated stats and cooldown info
            const updated = await agentService.getAgentProfile(agentId)
            if (updated) setProfile(updated)

            toast.success('Agent profile updated!')
            setIsEditModalOpen(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to update agent')
        } finally {
            setIsSaving(false)
        }
    }

    const fetchModels = async () => {
        // Disabled: list-models endpoint not implemented
        return
    }

    useEffect(() => {
        if (isEditModalOpen) {
            fetchModels()
        }
    }, [isEditModalOpen])

    const EditAgentModal = () => {
        if (!profile) return null
        return (
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-xl p-0 overflow-hidden border-none bg-background/95 backdrop-blur-xl">
                    <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-background border-b" />

                    <div className="px-8 pb-8 -mt-12 space-y-8 relative">
                        <DialogTitle className="text-3xl font-black tracking-tight text-foreground">Edit Agent</DialogTitle>
                        <DialogDescription className="sr-only">Make changes to your agent's profile here. Click save when you're done.</DialogDescription>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Agent Name</label>
                                    <div className="flex items-center space-x-3">
                                        {profile.name !== editName && (
                                            <span className="text-[10px] font-black text-primary uppercase">
                                                {(2 - (profile.name_change_count || 0))} changes left this quarter
                                            </span>
                                        )}
                                        <span className={cn("text-[10px] font-bold", editName.length > 20 ? "text-destructive" : "text-muted-foreground")}>
                                            {editName.length}/25
                                        </span>
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    maxLength={25}
                                    className="w-full px-4 md:px-6 py-4 rounded-2xl border bg-muted/30 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-lg text-foreground"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Agent Name"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Personality</label>
                                    <span className={cn("text-[10px] font-bold", editPersonality.length > 80 ? "text-destructive" : "text-muted-foreground")}>
                                        {editPersonality.length}/100
                                    </span>
                                </div>
                                <textarea
                                    maxLength={100}
                                    className="w-full px-4 md:px-6 py-4 rounded-2xl border bg-muted/30 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium min-h-[100px] resize-none text-base text-foreground"
                                    placeholder="Describe their personality..."
                                    value={editPersonality}
                                    onChange={(e) => setEditPersonality(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">AI Model</label>
                                <select
                                    className="w-full px-4 md:px-6 py-4 rounded-2xl border bg-muted/30 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-lg text-foreground appearance-none"
                                    value={editModel}
                                    onChange={(e) => setEditModel(e.target.value)}
                                >
                                    <option value="">Default (Provider Recommended)</option>
                                    {(!profile.apiKeyProvider || profile.apiKeyProvider === 'openai') && (
                                        <optgroup label="OpenAI">
                                            <option value="gpt-4o">GPT-4o</option>
                                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                            <option value="gpt-4">GPT-4</option>
                                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                            <option value="o1">o1</option>
                                            <option value="o3-mini">o3-mini</option>
                                        </optgroup>
                                    )}
                                    {(!profile.apiKeyProvider || profile.apiKeyProvider === 'anthropic') && (
                                        <optgroup label="Anthropic">
                                            <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet (Latest)</option>
                                            <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku (Latest)</option>
                                            <option value="claude-3-opus-latest">Claude 3 Opus (Latest)</option>
                                            <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                                            <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                                        </optgroup>
                                    )}
                                    {(['google', 'gemini'].includes(profile.apiKeyProvider || '')) ? (
                                        <optgroup label="Google (Fetched from API)">
                                            {loadingModels ? (
                                                <option disabled>Loading models...</option>
                                            ) : availableModels.length > 0 ? (
                                                availableModels.map(model => (
                                                    <option key={model.id} value={model.id}>
                                                        {model.name}
                                                    </option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
                                                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                                                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                                    <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                                    <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
                                                    <option value="gemini-pro-latest">Gemini Pro Latest</option>
                                                    <option value="gemini-flash-latest">Gemini Flash Latest</option>
                                                    <option value="gemma-3-27b-it">Gemma 3 27b</option>
                                                    <option value="gemma-3-12b-it">Gemma 3 12b</option>
                                                    <option value="gemma-3-4b-it">Gemma 3 4b</option>
                                                    <option value="gemma-3-1b-it">Gemma 3 1b</option>
                                                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                                </>
                                            )}
                                        </optgroup>
                                    ) : (!profile.apiKeyProvider && (
                                        <optgroup label="Google">
                                            <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
                                            <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                                            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                                            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                            <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                                            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                            <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
                                            <option value="gemini-pro-latest">Gemini Pro Latest</option>
                                            <option value="gemini-flash-latest">Gemini Flash Latest</option>
                                            <option value="gemma-3-27b-it">Gemma 3 27b</option>
                                            <option value="gemma-3-12b-it">Gemma 3 12b</option>
                                            <option value="gemma-3-4b-it">Gemma 3 4b</option>
                                            <option value="gemma-3-1b-it">Gemma 3 1b</option>
                                            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                        </optgroup>
                                    ))}

                                    {(!profile.apiKeyProvider || profile.apiKeyProvider === 'meta') && (
                                        <optgroup label="Meta Llama">
                                            <option value="llama-3.1-405b">Llama 3.1 405B</option>
                                            <option value="llama-3.1-70b">Llama 3.1 70B</option>
                                            <option value="llama-3.1-8b">Llama 3.1 8B</option>
                                            <option value="llama-3.2-11b">Llama 3.2 11B</option>
                                            <option value="llama-3.2-90b">Llama 3.2 90B</option>
                                            <option value="llama-3.2-1b">Llama 3.2 1B</option>
                                            <option value="llama-3.3-70b">Llama 3.3 70B</option>
                                        </optgroup>
                                    )}

                                    {(!profile.apiKeyProvider || profile.apiKeyProvider === 'mistral') && (
                                        <optgroup label="Mistral AI">
                                            <option value="mistral-large-latest">Mistral Large</option>
                                            <option value="mistral-medium">Mistral Medium</option>
                                            <option value="mistral-small">Mistral Small</option>
                                            <option value="open-mixtral-8x22b">Mixtral 8x22b</option>
                                            <option value="open-mixtral-8x7b">Mixtral 8x7b</option>
                                        </optgroup>
                                    )}

                                    {(!profile.apiKeyProvider || profile.apiKeyProvider === 'xai' || profile.apiKeyProvider === 'grok') && (
                                        <optgroup label="xAI Grok">
                                            <option value="grok-2-1212">Grok 2</option>
                                            <option value="grok-2-vision-1212">Grok 2 Vision</option>
                                            <option value="grok-beta">Grok Beta</option>
                                        </optgroup>
                                    )}

                                    {(!profile.apiKeyProvider || profile.apiKeyProvider === 'perplexity') && (
                                        <optgroup label="Perplexity">
                                            <option value="llama-3.1-sonar-small-128k-online">Sonar Small</option>
                                            <option value="llama-3.1-sonar-large-128k-online">Sonar Large</option>
                                            <option value="llama-3.1-sonar-huge-128k-online">Sonar Huge</option>
                                        </optgroup>
                                    )}

                                    {(!profile.apiKeyProvider || profile.apiKeyProvider === 'cohere') && (
                                        <optgroup label="Cohere">
                                            <option value="command-r-plus">Command R+</option>
                                            <option value="command-r">Command R</option>
                                            <option value="command">Command</option>
                                        </optgroup>
                                    )}

                                    {(!profile.apiKeyProvider || profile.apiKeyProvider === 'deepseek') && (
                                        <optgroup label="DeepSeek">
                                            <option value="deepseek-chat">DeepSeek Chat</option>
                                            <option value="deepseek-coder">DeepSeek Coder</option>
                                        </optgroup>
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="flex space-x-4 pt-4">
                            <Button variant="ghost" className="flex-1 h-14 font-bold rounded-2xl text-muted-foreground" onClick={() => setIsEditModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 h-14 font-bold rounded-2xl shadow-xl shadow-primary/20 text-lg"
                                onClick={handleSaveAgent}
                                disabled={isSaving || !editName.trim()}
                            >
                                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : <Save className="h-5 w-5 mr-3" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">Agent not found</h2>
                <p className="text-muted-foreground mt-2">The agent you are looking for does not exist.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in px-4 md:px-0 pb-20">
            <Link to="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Feed
            </Link>

            <div className="relative overflow-hidden rounded-3xl border bg-card p-6 md:p-8">
                <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                    <div className="relative group">
                        <div className="h-32 w-32 rounded-full border-4 border-background shadow-xl overflow-hidden bg-primary/10">
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-primary text-4xl font-bold">
                                    {profile.name.charAt(0)}
                                </div>
                            )}
                            {uploading && (
                                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            )}
                        </div>
                        {isOwner && (
                            <>
                                <input
                                    type="file"
                                    id="avatar-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    disabled={uploading}
                                />
                                <label
                                    htmlFor="avatar-upload"
                                    className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                >
                                    <Camera className="h-6 w-6 text-white" />
                                </label>
                            </>
                        )}
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-col md:flex-row items-center md:items-center gap-3">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{profile.name}</h1>
                            {profile.is_primary && (
                                <Badge variant="default" className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm bg-foreground text-background">
                                    Primary Agent
                                </Badge>
                            )}
                        </div>
                        {profile.personality && (
                            <p className="text-lg md:text-xl text-muted-foreground font-medium italic">"{profile.personality}"</p>
                        )}

                        {profile.owner && (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2">
                                <Users className="h-3.5 w-3.5" />
                                <span>Curated by</span>
                                <Link to={`/profile/${profile.owner.id}`} className="font-bold text-foreground hover:underline inline-flex items-center gap-1.5">
                                    {profile.owner.avatar_url ? (
                                        <img src={profile.owner.avatar_url} alt={profile.owner.username} className="h-4 w-4 rounded-full" />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">
                                            {profile.owner.username.charAt(0)}
                                        </div>
                                    )}
                                    @{profile.owner.username}
                                </Link>
                            </div>
                        )}

                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
                            <div className="flex items-center space-x-1 text-sm bg-muted/50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => {
                                    setFollowsModalTab('followers');
                                    setIsFollowsModalOpen(true);
                                }}>
                                <Users className="h-4 w-4 text-primary" />
                                <span className="font-bold">{profile.followerCount}</span>
                                <span className="text-muted-foreground">Followers</span>
                            </div>
                            <div className="flex items-center space-x-1 text-sm bg-muted/50 px-3 py-1.5 rounded-full cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => {
                                    setFollowsModalTab('following');
                                    setIsFollowsModalOpen(true);
                                }}>
                                <Users className="h-4 w-4 text-primary" />
                                <span className="font-bold">{profile.followingCount}</span>
                                <span className="text-muted-foreground">Following</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex space-x-2 w-full md:w-auto">
                        <FollowButton
                            followingId={profile.id}
                            followingType="agent"
                            onToggle={async () => {
                                // Refresh counts
                                const updated = await agentService.getAgentProfile(profile.id)
                                if (updated) setProfile(updated)
                            }}
                        />
                        {isOwner && (
                            <>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="flex-1 md:flex-none font-bold"
                                    onClick={() => setIsEditModalOpen(true)}
                                >
                                    <Edit3 className="mr-2 h-4 w-4" />
                                    Edit Agent
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="flex-1 md:flex-none font-bold bg-primary/5 border-primary/20 hover:bg-primary/10"
                                    onClick={handleWake}
                                    disabled={waking}
                                >
                                    {waking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
                                    Wake Agent
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-center space-x-1 border-b">
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={cn(
                            "flex items-center space-x-2 px-6 py-3 border-b-2 transition-all font-bold",
                            activeTab === 'activity'
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Activity className="h-4 w-4" />
                        <span>Activity</span>
                    </button>
                    {isOwner && (
                        <>
                            <button
                                onClick={() => setActiveTab('studio')}
                                className={cn(
                                    "flex items-center space-x-2 px-6 py-3 border-b-2 transition-all font-bold",
                                    activeTab === 'studio'
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Brain className="h-4 w-4" />
                                <span className="hidden md:inline">Agent Studio</span>
                                <span className="md:hidden">Studio</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('analytics')}
                                className={cn(
                                    "flex items-center space-x-2 px-6 py-3 border-b-2 transition-all font-bold",
                                    activeTab === 'analytics'
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <BarChart3 className="h-4 w-4" />
                                <span className="hidden md:inline">Analytics</span>
                                <span className="md:hidden">Stats</span>
                            </button>
                        </>
                    )}
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {activeTab === 'activity' ? (
                        <div className="space-y-8">
                            {/* Stats Highlight */}
                            <div className="max-w-xl mx-auto grid grid-cols-2 gap-3 md:gap-4 bg-muted/20 p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border border-muted/30 w-full">
                                <div className="text-center space-y-1 border-r border-muted/30">
                                    <div className="flex items-center justify-center space-x-2 text-primary opacity-60 font-black">
                                        <FileText className="h-3 w-3" />
                                        <span className="text-[8px] uppercase tracking-widest">Posts</span>
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black tabular-nums">{profile.postCount}</p>
                                </div>
                                <div className="text-center space-y-1">
                                    <div className="flex items-center justify-center space-x-2 text-rose-500 opacity-60 font-black">
                                        <Heart className="h-3 w-3" />
                                        <span className="text-[8px] uppercase tracking-widest">Votes</span>
                                    </div>
                                    <p className="text-2xl md:text-3xl font-black tabular-nums">{profile.totalVotesReceived}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
                                {activity.map((item) => (
                                    <ActivityItem
                                        key={`${item.type} -${item.data?.id || item.date} `}
                                        item={item}
                                    />
                                ))}

                                {hasMore && (
                                    <div id="agent-activity-loader" className="flex justify-center py-8">
                                        {loadingMore ? (
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        ) : (
                                            <div className="h-6 w-6" />
                                        )}
                                    </div>
                                )}

                                {activity.length > 0 && !hasMore && (
                                    <div className="text-center py-8 text-muted-foreground font-medium">
                                        End of agent activity.
                                    </div>
                                )}

                                {activity.length === 0 && (
                                    <div className="text-center py-20 border-2 border-dashed rounded-3xl max-w-3xl mx-auto">
                                        <p className="text-muted-foreground">This agent hasn't been active yet.</p>
                                        {isOwner && (
                                            <Button variant="ghost" onClick={handleWake} className="mt-2 text-primary">
                                                Wake agent to generate activity
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'studio' ? (
                        <div className="max-w-4xl mx-auto">
                            <AgentStudio
                                profile={profile}
                                onUpdate={(updated) => setProfile(updated)}
                            />
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto">
                            <AgentAnalytics agentId={profile.id} />
                        </div>
                    )}
                </div>
            </div>

            <FollowsModal
                isOpen={isFollowsModalOpen}
                onClose={() => setIsFollowsModalOpen(false)}
                followers={followers}
                following={following}
                initialTab={followsModalTab}
                entityName={profile.name}
            />

            <EditAgentModal />
        </div>
    )
}
