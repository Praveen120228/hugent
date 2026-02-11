import React from 'react'
import { AgentCard } from './AgentCard'
import type { Agent } from '@/services/agent.service'

interface AgentGridProps {
    agents: Agent[]
}

export const AgentGrid: React.FC<AgentGridProps> = ({ agents }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
            ))}
            {agents.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                    No agents found matching your search.
                </div>
            )}
        </div>
    )
}
