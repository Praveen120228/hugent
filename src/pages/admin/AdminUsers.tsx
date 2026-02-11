import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, Shield, ShieldAlert, UserX, CheckCircle, MoreHorizontal } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface UserProfile {
    id: string
    email?: string // Join query will populate this
    username: string
    full_name: string
    avatar_url: string
    created_at: string
    is_admin: boolean
    banned: boolean
    ban_reason?: string
}

export const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            // We need to join with auth.users to get email, but Supabase client doesn't support joining auth schema easily.
            // However, our profiles table might not have email if it's not synced. 
            // The `AdminLayout` ensures we are admin. 
            // We'll fetch profiles and if possible, we rely on profiles having data. 
            // Note: In this architecture, profiles usually exist for all users.

            // NOTE: RLS policy "Admins can view all profiles" must be active.

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            setUsers(data || [])
        } catch (error) {
            console.error('Error fetching users:', error)
            toast.error('Failed to fetch users')
        } finally {
            setLoading(false)
        }
    }

    const toggleBanUser = async (user: UserProfile) => {
        const isBanning = !user.banned;
        let reason = null;

        if (isBanning) {
            reason = prompt('Reason for banning this user (optional):');
            if (reason === null) return; // Cancelled
        } else {
            if (!confirm(`Are you sure you want to unban ${user.username || 'this user'}?`)) return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    banned: isBanning,
                    ban_reason: reason
                })
                .eq('id', user.id)

            if (error) throw error

            setUsers(users.map(u =>
                u.id === user.id ? { ...u, banned: isBanning, ban_reason: reason || undefined } : u
            ))

            toast.success(`User ${isBanning ? 'banned' : 'unbanned'} successfully`)
        } catch (error) {
            console.error('Error updating user status:', error)
            toast.error('Failed to update user status')
        }
    }

    const filteredUsers = users.filter(user =>
        (user.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.id || '').includes(searchQuery)
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                    <p className="text-muted-foreground">Manage user accounts and moderation.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 font-medium">User</th>
                                <th className="px-4 py-3 font-medium">Joined</th>
                                <th className="px-4 py-3 font-medium">Role</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.username} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-bold">{user.username?.charAt(0)?.toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{user.full_name || 'Unknown'}</div>
                                                    <div className="text-xs text-muted-foreground">@{user.username}</div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">{user.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {format(new Date(user.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.is_admin ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
                                                    <Shield className="h-3 w-3" /> Admin
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">User</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.banned ? (
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                                                        <ShieldAlert className="h-3 w-3" /> Banned
                                                    </span>
                                                    {user.ban_reason && (
                                                        <span className="text-[10px] text-muted-foreground max-w-[150px] truncate" title={user.ban_reason}>
                                                            Reason: {user.ban_reason}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                                                    <CheckCircle className="h-3 w-3" /> Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {!user.is_admin && (
                                                    <Button
                                                        variant={user.banned ? "outline" : "ghost"}
                                                        size="sm"
                                                        className={user.banned ? "text-green-600 border-green-200 hover:bg-green-50" : "text-destructive hover:bg-destructive/10"}
                                                        onClick={() => toggleBanUser(user)}
                                                    >
                                                        {user.banned ? 'Unban' : <UserX className="h-4 w-4" />}
                                                    </Button>
                                                )}
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
