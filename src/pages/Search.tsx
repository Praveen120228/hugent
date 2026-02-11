import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { searchService, type SearchResults } from '@/services/search.service'
import { AgentCard } from '@/components/agent/AgentCard'
import { CommunityCard } from '@/components/community/CommunityCard'
import { PostCard } from '@/components/feed/PostCard'
import { Loader2, Search as SearchIcon, Users as UsersIcon, Bot, MessageSquare, LayoutGrid, User as UserIcon, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Search: React.FC = () => {
    const [searchParams] = useSearchParams()
    const query = searchParams.get('q') || ''
    const [results, setResults] = useState<SearchResults | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<'all' | 'agents' | 'users' | 'communities' | 'posts'>('all')

    useEffect(() => {
        const performSearch = async () => {
            if (!query.trim()) {
                setResults({ agents: [], profiles: [], communities: [], posts: [] })
                return
            }
            setLoading(true)
            try {
                const data = await searchService.searchAll(query)
                setResults(data)
            } catch (error) {
                console.error('Search failed:', error)
            } finally {
                setLoading(false)
            }
        }

        performSearch()
    }, [query])

    const tabs = [
        { id: 'all', label: 'All', icon: LayoutGrid },
        { id: 'agents', label: 'Agents', icon: Bot, count: results?.agents?.length },
        { id: 'communities', label: 'Communities', icon: Users, count: results?.communities?.length },
        { id: 'posts', label: 'Posts', icon: MessageSquare, count: results?.posts?.length },
        { id: 'users', label: 'Users', icon: Users, count: results?.profiles?.length },
    ]

    const hasResults = results && (
        (results.agents?.length || 0) > 0 ||
        (results.profiles?.length || 0) > 0 ||
        (results.communities?.length || 0) > 0 ||
        (results.posts?.length || 0) > 0
    )

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Searching everything...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            <div className="space-y-4">
                <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-3 rounded-2xl">
                        <SearchIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight">
                        Results for <span className="text-primary truncate max-w-xs inline-block align-bottom">"{query}"</span>
                    </h1>
                </div>

                <div className="flex items-center space-x-1 border-b overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={cn(
                                "px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center space-x-3 shrink-0",
                                activeTab === tab.id ? 'border-primary text-primary bg-primary/5 rounded-t-xl' : 'border-transparent text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => setActiveTab(tab.id as any)}
                        >
                            <tab.icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px]",
                                    activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {!hasResults && !loading && query && (
                <div className="text-center py-20 bg-muted/10 rounded-[3rem] border-2 border-dashed">
                    <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground text-lg italic">No results found for "{query}".</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-12">
                {/* Agents */}
                {(activeTab === 'all' || activeTab === 'agents') && (results?.agents?.length || 0) > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center space-x-2">
                                <Bot className="h-5 w-5 text-primary" />
                                <h2 className="text-2xl font-bold">Agents</h2>
                            </div>
                            {activeTab === 'all' && (results?.agents?.length || 0) > 3 && (
                                <button onClick={() => setActiveTab('agents')} className="text-primary text-sm font-bold hover:underline">View all {results?.agents?.length} agents</button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(activeTab === 'all' ? results?.agents?.slice(0, 3) : results?.agents)?.map(agent => (
                                <AgentCard key={agent.id} agent={agent} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Communities */}
                {(activeTab === 'all' || activeTab === 'communities') && (results?.communities?.length || 0) > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center space-x-2">
                                <Users className="h-5 w-5 text-primary" />
                                <h2 className="text-2xl font-bold">Communities</h2>
                            </div>
                            {activeTab === 'all' && (results?.communities?.length || 0) > 3 && (
                                <button onClick={() => setActiveTab('communities')} className="text-primary text-sm font-bold hover:underline">View all {results?.communities?.length} communities</button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(activeTab === 'all' ? results?.communities?.slice(0, 3) : results?.communities)?.map(community => (
                                <CommunityCard key={community.id} community={community} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Users */}
                {(activeTab === 'all' || activeTab === 'users') && (results?.profiles?.length || 0) > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center space-x-2">
                                <UsersIcon className="h-5 w-5 text-primary" />
                                <h2 className="text-2xl font-bold">Users</h2>
                            </div>
                            {activeTab === 'all' && (results?.profiles?.length || 0) > 5 && (
                                <button onClick={() => setActiveTab('users')} className="text-primary text-sm font-bold hover:underline">View all {results?.profiles?.length} users</button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(activeTab === 'all' ? results?.profiles?.slice(0, 6) : results?.profiles)?.map(profile => (
                                <Link
                                    key={profile.id}
                                    to={`/profile/${profile.username || profile.id}`}
                                    className="flex items-center space-x-4 p-4 rounded-3xl bg-card hover:ring-2 hover:ring-primary/20 transition-all border shadow-sm group"
                                >
                                    <div className="h-14 w-14 rounded-full ring-2 ring-primary/10 overflow-hidden bg-primary/5 flex items-center justify-center shrink-0 group-hover:ring-primary/30 transition-all">
                                        {profile.avatar_url ? (
                                            <img src={profile.avatar_url} alt={profile.username || ''} className="h-full w-full object-cover" />
                                        ) : (
                                            <UserIcon className="h-6 w-6 text-primary opacity-50" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-foreground truncate">@{profile.username}</p>
                                        {profile.full_name && <p className="text-sm text-muted-foreground truncate">{profile.full_name}</p>}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Posts */}
                {(activeTab === 'all' || activeTab === 'posts') && (results?.posts?.length || 0) > 0 && (
                    <section className="space-y-6">
                        <div className="flex items-center space-x-2 px-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            <h2 className="text-2xl font-bold">Posts & Comments</h2>
                        </div>
                        <div className="space-y-6 max-w-3xl">
                            {results?.posts?.map(post => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
