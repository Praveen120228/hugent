import React, { useState, useEffect } from 'react'
import { Bell, Check, Clock } from 'lucide-react'
import { notificationService, type Notification } from '@/services/notification.service'
import { communityService } from '@/services/community.service'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/Button'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'

export const NotificationCenter: React.FC = () => {
    const { user } = useAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (!user) return
        const userId = user.id

        let isMounted = true
        let activeChannel: any = null

        const loadNotifications = async () => {
            const data = await notificationService.getNotifications(userId)
            if (isMounted) {
                setNotifications(data)
                setUnreadCount(data.filter(n => !n.is_read).length)
            }
        }

        const setupSubscription = () => {
            try {
                const channel = notificationService.subscribeToNotifications(userId, async (payload) => {
                    if (isMounted && payload.eventType === 'INSERT') {
                        const newNotification = payload.new as Notification
                        const enriched = await notificationService.enrichNotification(newNotification)
                        setNotifications(current => [enriched, ...current])
                        setUnreadCount(prev => prev + 1)
                    }
                })

                if (!isMounted) {
                    channel.unsubscribe()
                    return
                }

                activeChannel = channel
            } catch (error) {
                console.error('Failed to setup subscription:', error)
            }
        }

        loadNotifications()
        setupSubscription()

        return () => {
            isMounted = false
            if (activeChannel) {
                activeChannel.unsubscribe()
            }
        }
    }, [user?.id])

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationService.markAsRead(id)
            setNotifications(current => current.map(n => n.id === id ? { ...n, is_read: true } : n))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            console.error('Failed to mark as read:', error)
        }
    }

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                className="relative h-10 w-10 rounded-full hover:bg-muted/50 transition-colors"
                onClick={() => setIsOpen(true)}
            >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border-2 border-background">
                        {unreadCount}
                    </span>
                )}
            </Button>

            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open)
                if (open && user?.id) {
                    notificationService.markAllAsRead(user.id)
                        .then(() => {
                            setUnreadCount(0)
                            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
                        })
                        .catch(err => console.error('Failed to mark all as read', err))
                }
            }}>
                <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col p-0">
                    <div className="p-6 border-b">
                        <DialogTitle className="text-xl font-bold flex items-center justify-between">
                            <span>Notifications</span>
                            {unreadCount > 0 && (
                                <span className="text-sm font-medium text-muted-foreground">{unreadCount} unread</span>
                            )}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            View and manage your recent notifications.
                        </DialogDescription>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {notifications.length === 0 ? (
                            <div className="py-20 text-center flex flex-col items-center justify-center space-y-3 opacity-50">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                    <Bell className="h-6 w-6" />
                                </div>
                                <p className="text-sm font-medium italic">All quiet for now...</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            "group relative flex items-start space-x-4 p-4 rounded-xl transition-all",
                                            notification.is_read ? "opacity-60 grayscale-[0.5]" : "bg-primary/5 ring-1 ring-primary/10"
                                        )}
                                    >
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                            {notification.type === 'follow' && notification.metadata?.follower_type === 'user' ? (
                                                notification.actor_profile?.avatar_url ? (
                                                    <img src={notification.actor_profile.avatar_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="text-xs font-bold text-primary">{notification.actor_profile?.username?.charAt(0).toUpperCase() || 'U'}</div>
                                                )
                                            ) : (
                                                notification.actor?.avatar_url ? (
                                                    <img src={notification.actor.avatar_url} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="text-xs font-bold text-primary">{notification.actor?.name?.charAt(0) || 'S'}</div>
                                                )
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className="text-sm">
                                                <span className="font-bold text-foreground">
                                                    {notification.type === 'follow' && notification.metadata?.follower_type === 'user' ? (
                                                        <a href={`/profile/${notification.actor_profile?.username}`} className="hover:underline">
                                                            {notification.actor_profile?.username || 'Unknown User'}
                                                        </a>
                                                    ) : (
                                                        <span>{notification.actor?.name || 'System'}</span>
                                                    )}
                                                </span>
                                                {" "}
                                                <span className="text-muted-foreground">{notification.content}</span>
                                            </p>

                                            {/* Action Buttons for Community Requests */}
                                            {notification.type === 'community_request' && notification.metadata && !notification.is_read && (
                                                <div className="flex space-x-2 mt-2">
                                                    <Button
                                                        size="sm"
                                                        className="h-7 px-3 text-xs"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            communityService.approveRequest(notification.metadata.requester_id, notification.metadata.community_id)
                                                                .then(() => handleMarkAsRead(notification.id))
                                                                .catch(err => console.error('Failed to approve', err))
                                                        }}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-3 text-xs hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            communityService.rejectRequest(notification.metadata.requester_id, notification.metadata.community_id)
                                                                .then(() => handleMarkAsRead(notification.id))
                                                                .catch(err => console.error('Failed to reject', err))
                                                        }}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}

                                            <div className="mt-1 flex items-center space-x-2 text-[10px] text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                                            </div>
                                        </div>
                                        {!notification.is_read && (
                                            <button
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                className="absolute right-4 top-4 p-1 rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Check className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
