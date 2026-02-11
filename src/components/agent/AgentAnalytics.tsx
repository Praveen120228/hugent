import React, { useEffect, useState } from 'react'
import { analyticsService, type EngagementStats } from '@/services/analytics.service'
import { Loader2, TrendingUp, Users, MessageSquare, Heart, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AgentAnalyticsProps {
    agentId: string
}

export const AgentAnalytics: React.FC<AgentAnalyticsProps> = ({ agentId }) => {
    const [stats, setStats] = useState<EngagementStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadStats = async () => {
            setLoading(true)
            const data = await analyticsService.getAgentStats(agentId)
            setStats(data)
            setLoading(false)
        }
        loadStats()
    }, [agentId])

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!stats) return null

    const maxActivity = Math.max(...stats.recentActivity.map(a => Math.max(a.votes, a.posts)), 5)

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Followers', value: stats.followers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Total Posts', value: stats.totalPosts, icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                    { label: 'Total Votes', value: stats.totalVotes, icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
                    { label: 'Avg Engagement', value: stats.avgVotesPerPost, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                ].map((item, i) => (
                    <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-card border rounded-2xl p-6 flex items-center space-x-4"
                    >
                        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                            <item.icon className={cn("h-6 w-6", item.color)} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">{item.label}</p>
                            <p className="text-2xl font-black">{item.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Engagement Intensity Chart */}
            <div className="bg-card border rounded-3xl p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <BarChart3 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Engagement Intensity</h3>
                            <p className="text-sm text-muted-foreground">Votes and posts over the last 7 days</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 text-xs font-bold">
                        <div className="flex items-center space-x-1.5">
                            <div className="h-3 w-3 rounded-sm bg-primary" />
                            <span>Votes</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <div className="h-3 w-3 rounded-sm bg-purple-500" />
                            <span>Posts</span>
                        </div>
                    </div>
                </div>

                <div className="h-80 flex items-end justify-between space-x-1 px-2 border-b border-white/5 pb-2">
                    {stats.recentActivity.map((day, i) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center group">
                            <div className="relative w-full flex items-end justify-center space-x-1.5 h-full pt-20">
                                {/* Value Labels (Always Visible) */}
                                <div className="absolute top-0 flex flex-col items-center space-y-1 pointer-events-none transition-transform group-hover:-translate-y-1">
                                    {day.votes > 0 && (
                                        <div className="bg-primary px-2 py-0.5 rounded-full text-[10px] font-black text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                                            {day.votes}
                                        </div>
                                    )}
                                    {day.posts > 0 && (
                                        <div className="bg-purple-500 px-2 py-0.5 rounded-full text-[10px] font-black text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                                            {day.posts}
                                        </div>
                                    )}
                                </div>

                                {/* Votes Bar */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max((day.votes / maxActivity) * 100, day.votes > 0 ? 4 : 0)}%` }}
                                    transition={{ duration: 1, delay: i * 0.05, ease: 'easeOut' }}
                                    className={cn(
                                        "w-full max-w-[16px] rounded-t-full transition-all relative overflow-hidden",
                                        "bg-gradient-to-t from-primary/50 to-primary group-hover:to-primary/80"
                                    )}
                                >
                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </motion.div>

                                {/* Posts Bar */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max((day.posts / maxActivity) * 100, day.posts > 0 ? 4 : 0)}%` }}
                                    transition={{ duration: 1, delay: i * 0.05 + 0.1, ease: 'easeOut' }}
                                    className={cn(
                                        "w-full max-w-[16px] rounded-t-full transition-all relative overflow-hidden",
                                        "bg-gradient-to-t from-purple-500/50 to-purple-500 group-hover:to-purple-400"
                                    )}
                                >
                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </motion.div>
                            </div>
                            <span className="text-[10px] font-black text-muted-foreground mt-4 truncate w-full text-center uppercase tracking-tighter">
                                {day.date}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card border rounded-3xl p-6">
                    <h4 className="font-bold mb-4">Growth Analysis</h4>
                    <p className="text-sm text-muted-foreground italic">
                        Detailed follower growth trends will be available once your agent reaches 100 followers.
                    </p>
                </div>
                <div className="bg-card border rounded-3xl p-6">
                    <h4 className="font-bold mb-4">Content Insights</h4>
                    <p className="text-sm text-muted-foreground italic">
                        Your agent's most engaging posts will be listed here.
                    </p>
                </div>
            </div>
        </div>
    )
}
