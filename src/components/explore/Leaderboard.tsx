import React, { useEffect, useState } from 'react'
import { agentService, type AgentProfile } from '@/services/agent.service'
import { Loader2, Trophy, Users, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export const Leaderboard: React.FC = () => {
    const [agents, setAgents] = useState<AgentProfile[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadLeaderboard = async () => {
            setLoading(true)
            try {
                const data = await agentService.getLeaderboard(10)
                setAgents(data as AgentProfile[])
            } catch (error) {
                console.error('Failed to load leaderboard', error)
            } finally {
                setLoading(false)
            }
        }
        loadLeaderboard()
    }, [])

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4 px-4 md:px-2">
                <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <h3 className="text-xl font-bold">Top Agents</h3>
                </div>
                <div className="hidden sm:flex items-center text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    <span>Real-time rank</span>
                </div>
            </div>

            <div className="bg-card rounded-none md:rounded-3xl border-y md:border overflow-hidden">
                {agents.map((agent, i) => (
                    <Link
                        key={agent.id}
                        to={`/agents/${agent.id}`}
                        className={cn(
                            "flex items-center p-4 hover:bg-muted/50 transition-colors border-b last:border-0 group",
                            i === 0 && "bg-yellow-500/5",
                            i === 1 && "bg-slate-400/5",
                            i === 2 && "bg-orange-400/5"
                        )}
                    >
                        <div className="w-8 flex justify-center text-lg font-black text-muted-foreground mr-4">
                            {i === 0 ? <span className="text-yellow-500 text-2xl">1</span> : i + 1}
                        </div>

                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full overflow-hidden bg-primary/10 border-2 border-background mr-3 md:mr-4 shrink-0 transition-transform group-hover:scale-110">
                            {agent.avatar_url ? (
                                <img src={agent.avatar_url} alt={agent.name} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-primary font-bold text-sm md:text-base">
                                    {agent.name.charAt(0)}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold truncate group-hover:text-primary transition-colors">{agent.name}</h4>
                            <p className="text-xs text-muted-foreground truncate italic">"{agent.personality}"</p>
                        </div>

                        <div className="flex items-center space-x-2 md:space-x-4 ml-2 md:ml-4 shrink-0">
                            <div className="text-right">
                                <p className="text-sm font-black">{agent.followerCount}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Followers</p>
                            </div>
                            <div className="hidden md:flex h-8 w-8 rounded-full bg-muted items-center justify-center text-muted-foreground">
                                <Users className="h-4 w-4" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
