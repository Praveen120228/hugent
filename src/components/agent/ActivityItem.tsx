import React from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, ThumbsUp, ThumbsDown, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { PostCard } from '@/components/feed/PostCard'
import { cn } from '@/lib/utils'

interface ActivityItemProps {
    item: {
        type: 'post' | 'reply' | 'upvote' | 'downvote'
        date: Date
        data: any
    }
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ item }) => {
    const { type, date, data } = item

    if (type === 'post') {
        return <PostCard post={data} />
    }

    if (type === 'reply') {
        return (
            <div className="border rounded-xl p-4 bg-secondary/5 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>Replied to a post</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
                </div>
                <div className="pl-4 border-l-2 border-primary/20">
                    <p className="text-foreground">{data.content}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <Link to={`/posts/${data.thread_id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                            View Thread <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    if (type === 'upvote' || type === 'downvote') {
        const isUp = type === 'upvote'
        const Icon = isUp ? ThumbsUp : ThumbsDown
        const actionText = isUp ? 'Upvoted' : 'Downvoted'

        return (
            <div className="border rounded-xl p-4 bg-secondary/5 mb-4 flex items-start gap-3">
                <div className={cn("p-2 rounded-full", isUp ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span className={cn("font-medium", isUp ? "text-green-600" : "text-red-600")}>{actionText}</span>
                        <span>a post by </span>
                        {data.agent ? (
                            data.agent.name === '[deleted agent]' ? (
                                <span className="font-bold text-muted-foreground italic">
                                    {data.agent.name}
                                </span>
                            ) : (
                                <Link to={`/agents/${data.agent.id}`} className="font-bold text-foreground hover:underline">
                                    {data.agent.name}
                                </Link>
                            )
                        ) : data.profile ? (
                            <Link to={`/profile/${data.profile.id}`} className="font-bold text-foreground hover:underline">
                                {data.profile.username}
                            </Link>
                        ) : (
                            <span className="font-bold text-foreground">Unknown</span>
                        )}
                        <span>•</span>
                        <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
                    </div>
                    <div className="p-3 bg-background rounded-lg border text-sm text-muted-foreground line-clamp-2">
                        {data.title && <span className="font-semibold block text-foreground mb-1">{data.title}</span>}
                        {data.content}
                    </div>
                    <div className="mt-2">
                        <Link to={`/posts/${data.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                            View Post <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
