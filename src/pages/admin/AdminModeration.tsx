import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { X, AlertTriangle, ShieldAlert } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Report {
    id: string
    reporter_id: string
    post_id: string
    reason: string
    status: 'pending' | 'resolved' | 'dismissed'
    created_at: string
    post: {
        content: string
        id: string
    } | null
    reporter: {
        username: string
        email: string
    } | null
}

export const AdminModeration: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchReports()
    }, [])

    const fetchReports = async () => {
        try {
            const { data, error } = await supabase
                .from('content_reports')
                .select(`
                    *,
                    post:posts(id, content),
                    reporter:profiles(username, email)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            if (error) throw error
            setReports(data || [])
        } catch (error) {
            console.error('Error fetching reports:', error)
            toast.error('Failed to fetch reports')
        } finally {
            setLoading(false)
        }
    }

    const handleDismiss = async (id: string) => {
        try {
            const { error } = await supabase
                .from('content_reports')
                .update({
                    status: 'dismissed',
                    resolved_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error

            setReports(reports.filter(r => r.id !== id))
            toast.success('Report dismissed')
        } catch (error) {
            console.error('Error dismissing report:', error)
            toast.error('Failed to dismiss report')
        }
    }

    const handleDeletePost = async (reportId: string, postId: string) => {
        if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return

        try {
            // First mark report as resolved
            const { error: reportError } = await supabase
                .from('content_reports')
                .update({
                    status: 'resolved',
                    resolved_at: new Date().toISOString()
                })
                .eq('id', reportId)

            if (reportError) throw reportError

            // Then delete the post
            const { error: postError } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId)

            if (postError) throw postError

            setReports(reports.filter(r => r.id !== reportId))
            toast.success('Post deleted and report resolved')
        } catch (error) {
            console.error('Error deleting post:', error)
            // If post delete fails but report updated, we might be in inconsistent state, 
            // but fetching again will sync UI
            fetchReports()
            toast.error('Failed to delete post')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Content Moderation</h1>
                    <p className="text-muted-foreground">Review and take action on flagged content.</p>
                </div>
            </div>

            <div className="rounded-xl border bg-card shadow-sm">
                <div className="p-6">
                    {loading ? (
                        <p className="text-center py-8 text-muted-foreground">Loading reports...</p>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No pending reports. Good job!</p>
                        </div>
                    ) : (
                        <div className="relative w-full overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                    <tr>
                                        <th className="px-4 py-3">Reported By</th>
                                        <th className="px-4 py-3">Content Snippet</th>
                                        <th className="px-4 py-3">Reason</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {reports.map((report) => (
                                        <tr key={report.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">{report.reporter?.username || 'Unknown'}</div>
                                                <div className="text-xs text-muted-foreground">{report.reporter?.email}</div>
                                            </td>
                                            <td className="px-4 py-3 max-w-[300px]">
                                                {report.post ? (
                                                    <div className="truncate text-foreground font-mono bg-muted/30 p-1 rounded">
                                                        {report.post.content.substring(0, 50)}...
                                                    </div>
                                                ) : (
                                                    <span className="text-destructive italic">Content deleted</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20">
                                                    {report.reason}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {format(new Date(report.created_at), 'MMM d, h:mm a')}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleDismiss(report.id)}
                                                    >
                                                        <X className="mr-1 h-3 w-3" />
                                                        Dismiss
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => report.post && handleDeletePost(report.id, report.post.id)}
                                                        disabled={!report.post}
                                                    >
                                                        <AlertTriangle className="mr-1 h-3 w-3" />
                                                        Delete Post
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
