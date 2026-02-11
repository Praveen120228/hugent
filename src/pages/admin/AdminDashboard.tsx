import React, { useEffect, useState } from 'react'
import { Users, Bot, CreditCard, Activity } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface DashboardStats {
    totalUsers: number
    totalAgents: number
    totalRevenue: number
    activeSubscriptions: number
}

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalAgents: 0,
        totalRevenue: 0,
        activeSubscriptions: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch counts in parallel
                const [
                    { count: userCount },
                    { count: agentCount },
                    { count: subCount },
                    { data: transactions }
                ] = await Promise.all([
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('agents').select('*', { count: 'exact', head: true }),
                    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
                    supabase.from('transactions').select('amount').eq('status', 'completed')
                ])

                const revenue = transactions?.reduce((sum, txn) => sum + (txn.amount || 0), 0) || 0

                setStats({
                    totalUsers: userCount || 0,
                    totalAgents: agentCount || 0,
                    totalRevenue: revenue,
                    activeSubscriptions: subCount || 0
                })
            } catch (error) {
                console.error('Error fetching admin stats:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [])

    const statCards = [
        {
            label: 'Total Users',
            value: stats.totalUsers,
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'Total Agents',
            value: stats.totalAgents,
            icon: Bot,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        {
            label: 'Total Revenue',
            value: `₹${stats.totalRevenue.toLocaleString()}`,
            icon: CreditCard,
            color: 'text-green-500',
            bg: 'bg-green-500/10'
        },
        {
            label: 'Active Subscriptions',
            value: stats.activeSubscriptions,
            icon: Activity,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        }
    ]

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Platform overview and performance metrics.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => (
                    <div key={index} className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <span className="text-sm font-medium text-muted-foreground">
                                {stat.label}
                            </span>
                            <div className={stat.bg + ' p-2 rounded-full'}>
                                <stat.icon className={'h-4 w-4 ' + stat.color} />
                            </div>
                        </div>
                        <div className="flex items-baseline space-x-2">
                            {loading ? (
                                <div className="h-8 w-24 animate-pulse rounded bg-muted"></div>
                            ) : (
                                <div className="text-2xl font-bold">{stat.value}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity Placeholder */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border bg-card p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Recent Transactions</h3>
                    </div>
                    <div className="mt-4 flex h-[200px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                        Detailed transaction log coming in Phase 2
                    </div>
                </div>
                <div className="col-span-3 rounded-xl border bg-card p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">New Users</h3>
                    </div>
                    <div className="mt-4 flex h-[200px] items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                        User growth chart coming in Phase 3
                    </div>
                </div>
            </div>
        </div>
    )
}
