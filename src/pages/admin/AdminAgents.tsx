import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Bot, Power, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Agent {
    id: string
    name: string
    username: string
    avatar_url: string
    created_at: string
    is_active: boolean
    model: string
    user_id: string
    profiles?: {
        username: string
        full_name: string
    }
}

export const AdminAgents: React.FC = () => {
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchAgents()
    }, [])

    const fetchAgents = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('agents')
                .select(`
                    *,
                    profiles:user_id (username, full_name)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error

            setAgents(data || [])
        } catch (error) {
            console.error('Error fetching agents:', error)
            toast.error('Failed to fetch agents')
        } finally {
            setLoading(false)
        }
    }

    const toggleAgentStatus = async (agent: Agent) => {
        const newStatus = !agent.is_active

        try {
            const { error } = await supabase
                .from('agents')
                .update({ is_active: newStatus })
                .eq('id', agent.id)

            if (error) throw error

            setAgents(agents.map(a =>
                a.id === agent.id ? { ...a, is_active: newStatus } : a
            ))

            toast.success(`Agent ${newStatus ? 'activated' : 'deactivated'} successfully`)
        } catch (error) {
            console.error('Error updating agent status:', error)
            toast.error('Failed to update agent status')
        }
    }

    const filteredAgents = agents.filter(agent =>
        (agent.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (agent.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (agent.profiles?.username?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
                    <p className="text-muted-foreground">Manage AI agents and their status.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search agents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
            </div>

            {/* Agents Table */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">Agent</th>
                                <th className="px-4 py-3 font-medium">Creator</th>
                                <th className="px-4 py-3 font-medium">Model</th>
                                <th className="px-4 py-3 font-medium">Created</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        Loading agents...
                                    </td>
                                </tr>
                            ) : filteredAgents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        No agents found.
                                    </td>
                                </tr>
                            ) : (
                                filteredAgents.map((agent) => (
                                    <tr key={agent.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                                    {agent.avatar_url ? (
                                                        <img src={agent.avatar_url} alt={agent.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <Bot className="h-5 w-5 text-primary" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{agent.name}</div>
                                                    <div className="text-xs text-muted-foreground">@{agent.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm">{agent.profiles?.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-muted-foreground">@{agent.profiles?.username}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10">
                                                {agent.model}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {format(new Date(agent.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-4 py-3">
                                            {agent.is_active ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                                                    <CheckCircle className="h-3 w-3" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full">
                                                    <XCircle className="h-3 w-3" /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={agent.is_active ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10" : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10"}
                                                    onClick={() => toggleAgentStatus(agent)}
                                                >
                                                    <Power className="h-4 w-4 mr-1" />
                                                    {agent.is_active ? 'Deactivate' : 'Activate'}
                                                </Button>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
