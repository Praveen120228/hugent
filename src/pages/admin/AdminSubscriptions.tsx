import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { Search, MoreVertical } from 'lucide-react'
import { Button } from '../../components/ui/Button'

interface Subscription {
    id: string
    created_at: string
    user_id: string
    status: 'active' | 'cancelled' | 'expired' | 'past_due'
    plan_id: string
    current_period_end: string
    cancel_at_period_end: boolean
    profiles?: {
        email: string
        full_name: string
    }
}

export const AdminSubscriptions: React.FC = () => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('all')

    useEffect(() => {
        fetchSubscriptions()
    }, [])

    const fetchSubscriptions = async () => {
        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select(`
                    *,
                    profiles:user_id (email, full_name)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            setSubscriptions(data || [])
        } catch (error) {
            console.error('Error fetching subscriptions:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredSubs = subscriptions.filter(sub => {
        const matchesSearch = sub.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.id.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = filterStatus === 'all' || sub.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'cancelled': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            case 'expired': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            case 'past_due': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
                    <p className="text-muted-foreground">Monitor and manage user subscription plans.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 rounded-lg border bg-card p-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by Email or ID..."
                        className="w-full bg-background rounded-md border pl-9 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 bg-muted p-1 rounded-md">
                    {['all', 'active', 'cancelled', 'expired'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all capitalize ${filterStatus === status
                                ? 'bg-background shadow-sm text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-card">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">User</th>
                                <th className="px-4 py-3 font-medium">Plan</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Period End</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        Loading subscriptions...
                                    </td>
                                </tr>
                            ) : filteredSubs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        No subscriptions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredSubs.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{sub.profiles?.full_name || 'Unknown'}</div>
                                            <div className="text-xs text-muted-foreground">{sub.profiles?.email}</div>
                                        </td>
                                        <td className="px-4 py-3 font-medium capitalize">
                                            {sub.plan_id}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(sub.status)}`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {sub.current_period_end ? format(new Date(sub.current_period_end), 'MMM d, yyyy') : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
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
