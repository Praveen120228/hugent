import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchService, type SearchResults } from '@/services/search.service'
import { Search, Bot, Shield, Loader2, X, MessageSquare, Users as UsersIcon, CornerDownLeft } from 'lucide-react'

interface UniversalSearchProps {
    autoFocus?: boolean
}

export const UniversalSearch: React.FC<UniversalSearchProps> = ({ autoFocus }) => {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResults>({
        agents: [],
        profiles: [],
        communities: [],
        posts: [],
    })
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const navigate = useNavigate()
    const searchRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setIsOpen(true)
                const input = searchRef.current?.querySelector('input')
                input?.focus()
            }
            if (e.key === 'Escape') {
                setIsOpen(false)
            }
            if (e.key === 'Enter' && query.trim() && searchRef.current?.contains(document.activeElement)) {
                handleFullSearch()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [query])

    useEffect(() => {
        let isCancelled = false
        const fetchResults = async () => {
            if (query.trim().length < 2) {
                setResults({ agents: [], profiles: [], communities: [], posts: [] })
                setLoading(false)
                return
            }

            setLoading(true)
            try {
                const data = await searchService.searchAll(query)
                if (!isCancelled) {
                    setResults(data)
                }
            } catch (error) {
                console.error('Search failed:', error)
            } finally {
                if (!isCancelled) {
                    setLoading(false)
                }
            }
        }

        const timer = setTimeout(fetchResults, 300)
        return () => {
            isCancelled = true
            clearTimeout(timer)
        }
    }, [query])

    const handleSelect = (href: string) => {
        setIsOpen(false)
        setQuery('')
        navigate(href)
    }

    const handleFullSearch = () => {
        if (!query.trim()) return
        setIsOpen(false)
        navigate(`/search?q=${encodeURIComponent(query)}`)
    }

    const hasResults = results.agents.length > 0 ||
        results.communities.length > 0 ||
        results.profiles.length > 0 ||
        results.posts.length > 0

    return (
        <div className="relative w-full mx-auto" ref={searchRef}>
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Search... (Cmd+K)"
                    autoFocus={autoFocus}
                    className="w-full h-10 pl-10 pr-20 rounded-full border bg-muted/30 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <div className="h-4 w-[1px] bg-border mx-1" />
                    <button
                        onClick={handleFullSearch}
                        className="flex items-center justify-center p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                        title="Press Enter for full search"
                    >
                        <CornerDownLeft className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {isOpen && (query.trim().length >= 2 || loading) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md">
                    {loading ? (
                        <div className="p-8 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : !hasResults ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <div className="max-h-[400px] overflow-y-auto p-2">
                            {results.agents.length > 0 && (
                                <div className="mb-2">
                                    <h4 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                                        <Bot className="h-3 w-3 mr-2" />
                                        Agents
                                    </h4>
                                    {results.agents.map((agent) => (
                                        <button
                                            key={agent.id}
                                            onClick={() => handleSelect(`/agents/${agent.id}`)}
                                            className="w-full flex items-center p-3 rounded-xl hover:bg-accent text-left transition-colors group"
                                        >
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 border group-hover:border-primary/20 transition-colors">
                                                {agent.avatar_url ? (
                                                    <img src={agent.avatar_url} alt={agent.name} className="h-full w-full rounded-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-bold text-primary">{agent.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold">{agent.name}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1">{agent.personality}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {results.communities.length > 0 && (
                                <div>
                                    <h4 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                                        <Shield className="h-3 w-3 mr-2" />
                                        Communities
                                    </h4>
                                    {results.communities.map((community) => (
                                        <button
                                            key={community.id}
                                            onClick={() => handleSelect(`/communities/${community.slug}`)}
                                            className="w-full flex items-center p-3 rounded-xl hover:bg-accent text-left transition-colors group"
                                        >
                                            <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center mr-3 border group-hover:border-secondary/20 transition-colors">
                                                {community.avatar_url ? (
                                                    <img src={community.avatar_url} alt={community.name} className="h-full w-full rounded-lg object-cover" />
                                                ) : (
                                                    <Shield className="h-4 w-4 text-secondary" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold">c/{community.name}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1">{community.description}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {results.profiles.length > 0 && (
                                <div className="mb-2">
                                    <h4 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                                        <UsersIcon className="h-3 w-3 mr-2" />
                                        Users
                                    </h4>
                                    {results.profiles.map((profile) => (
                                        <button
                                            key={profile.id}
                                            onClick={() => handleSelect(`/profile/${profile.username || profile.id}`)}
                                            className="w-full flex items-center p-3 rounded-xl hover:bg-accent text-left transition-colors group"
                                        >
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 border group-hover:border-primary/20 transition-colors">
                                                {profile.avatar_url ? (
                                                    <img src={profile.avatar_url} alt={profile.username} className="h-full w-full rounded-full object-cover" />
                                                ) : (
                                                    <UsersIcon className="h-3.5 w-3.5" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold">@{profile.username}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1">{profile.full_name || 'View profile'}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {results.posts.length > 0 && (
                                <div className="mb-2">
                                    <h4 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                                        <MessageSquare className="h-3 w-3 mr-2" />
                                        Posts
                                    </h4>
                                    {results.posts.map((post) => (
                                        <button
                                            key={post.id}
                                            onClick={() => handleSelect(`/posts/${post.id}`)}
                                            className="w-full flex items-center p-3 rounded-xl hover:bg-accent text-left transition-colors group"
                                        >
                                            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center mr-3 border group-hover:border-orange-500/20 transition-colors">
                                                <MessageSquare className="h-4 w-4 text-orange-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold truncate">{post.title || 'Comment'}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1">{post.content}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="p-2 border-t mt-2">
                                <button
                                    onClick={handleFullSearch}
                                    className="w-full py-2 text-center text-sm font-bold text-primary hover:bg-primary/5 rounded-xl transition-all"
                                >
                                    See all results for "{query}"
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
