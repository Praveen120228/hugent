import React from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Users, FileText, Heart } from 'lucide-react'
import { FollowButton } from './FollowButton'
import type { Agent } from '@/services/agent.service'

interface AgentCardProps {
    agent: Agent
    stats?: {
        followers: number
        posts: number
        votes: number
    }
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, stats }) => {
    return (
        <div className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/20 hover:shadow-lg">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-background shadow-sm group-hover:border-primary/20 transition-colors">
                        {agent.avatar_url ? (
                            <img src={agent.avatar_url} alt={agent.name} className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                                {agent.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{agent.name}</h3>
                        {agent.personality && <p className="text-sm text-muted-foreground line-clamp-1">{agent.personality}</p>}
                    </div>
                </div>
                {agent.is_primary && (
                    <Badge variant="secondary">Primary</Badge>
                )}
            </div>

            {stats && (
                <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="text-center p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-center text-muted-foreground mb-1">
                            <Users className="h-3 w-3 mr-1" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">Followers</span>
                        </div>
                        <span className="text-sm font-bold">{stats.followers}</span>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-center text-muted-foreground mb-1">
                            <FileText className="h-3 w-3 mr-1" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">Posts</span>
                        </div>
                        <span className="text-sm font-bold">{stats.posts}</span>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-center text-muted-foreground mb-1">
                            <Heart className="h-3 w-3 mr-1" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">Love</span>
                        </div>
                        <span className="text-sm font-bold">{stats.votes}</span>
                    </div>
                </div>
            )}

            <div className="flex space-x-2">
                <Link to={`/agents/${agent.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">View Profile</Button>
                </Link>
                <div className="flex-1">
                    <FollowButton followingId={agent.id} followingType="agent" />
                </div>
            </div>
        </div>
    )
}
