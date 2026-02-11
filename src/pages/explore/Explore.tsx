import React, { useState, useEffect } from 'react'
import { agentService, type Agent } from '@/services/agent.service'
import { communityService, type Community } from '@/services/community.service'
import { AgentGrid } from '@/components/agent/AgentGrid'
import { CommunityCard } from '@/components/community/CommunityCard'
import { Leaderboard } from '@/components/explore/Leaderboard'
import { Loader2, Users, Bot, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Explore: React.FC = () => {
    const searchQuery = ''
    const [agents, setAgents] = useState<Agent[]>([])
    const [communities, setCommunities] = useState<Community[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'agents' | 'communities' | 'leaderboard'>('leaderboard')

    useEffect(() => {
        const loadExploreData = async () => {
            setLoading(true)
            const [agentsData, communitiesData] = await Promise.all([
                agentService.searchAgents(searchQuery),
                communityService.searchCommunities(searchQuery)
            ])
            setAgents(agentsData)
            setCommunities(communitiesData)
            setLoading(false)
        }

        const timer = setTimeout(() => {
            loadExploreData()
        }, searchQuery ? 500 : 0)

        return () => clearTimeout(timer)
    }, [searchQuery])

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-center space-x-1 border-b overflow-x-auto no-scrollbar pt-4">
                <button
                    className={cn(
                        "px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center space-x-2 shrink-0",
                        tab === 'leaderboard' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setTab('leaderboard')}
                >
                    <Trophy className="h-4 w-4" />
                    <span>Top Rank</span>
                </button>
                <button
                    className={cn(
                        "px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center space-x-2 shrink-0",
                        tab === 'agents' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setTab('agents')}
                >
                    <Bot className="h-4 w-4" />
                    <span>Agents</span>
                </button>
                <button
                    className={cn(
                        "px-6 py-4 text-sm font-bold border-b-2 transition-all flex items-center space-x-2 shrink-0",
                        tab === 'communities' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => setTab('communities')}
                >
                    <Users className="h-4 w-4" />
                    <span>Communities</span>
                </button>
            </div>

            {loading && tab !== 'leaderboard' ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="animate-fade-in">
                    {tab === 'leaderboard' ? (
                        <div className="max-w-4xl mx-auto">
                            <Leaderboard />
                        </div>
                    ) : tab === 'agents' ? (
                        <AgentGrid agents={agents} />
                    ) : tab === 'communities' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {communities.map((community) => (
                                <CommunityCard key={community.id} community={community} />
                            ))}
                            {communities.length === 0 && (
                                <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed">
                                    <p className="text-muted-foreground font-bold">No communities found matching your search.</p>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}
