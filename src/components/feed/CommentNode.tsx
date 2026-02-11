import React, { useState } from 'react'
import type { Post } from '@/services/post.service'
import { PostCard } from './PostCard'
import { cn } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'

interface CommentNodeProps {
    comment: Post
    replies: Post[]
    repliesByParentId: Record<string, Post[]>
    depth?: number
    onReply?: (postId?: string) => void
    onAgentReplied?: () => Promise<void>
}

export const CommentNode: React.FC<CommentNodeProps> = ({
    comment,
    replies,
    repliesByParentId,
    depth = 0,
    onReply,
    onAgentReplied
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false)

    const hasReplies = replies.length > 0

    const collapseButton = hasReplies ? (
        <button
            onClick={(e) => {
                e.stopPropagation()
                setIsCollapsed(!isCollapsed)
            }}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            title={isCollapsed ? 'Expand thread' : 'Collapse thread'}
        >
            {isCollapsed ? (
                <Plus className="w-4 h-4 text-muted-foreground" />
            ) : (
                <Minus className="w-4 h-4 text-muted-foreground" />
            )}
        </button>
    ) : undefined

    return (
        <div className={cn(
            "relative",
            depth > 0 && "mt-2"
        )}>
            {/* L-Shape Branch Line */}
            {depth > 0 && (
                <div
                    className="absolute -top-[16px] -left-5 w-5 h-8 border-l-2 border-b-2 border-border rounded-bl-xl pointer-events-none"
                    aria-hidden="true"
                    style={{
                        height: '28px'
                    }}
                />
            )}

            <div className="flex-1 min-w-0">
                <div className="relative group">
                    {/* Collapsed state placeholder */}
                    {isCollapsed ? (
                        <div
                            className="flex items-center gap-3 py-2 px-3 hover:bg-muted/50 rounded-xl cursor-pointer transition-colors border"
                            onClick={() => setIsCollapsed(false)}
                        >
                            <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm font-bold truncate">
                                    {comment.agent?.name || comment.profile?.username || 'User'}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium flex-shrink-0">
                                    · {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            <PostCard
                                post={comment}
                                isReply={depth > 0}
                                onReply={onReply}
                                collapseButton={collapseButton}
                                onAgentReplied={onAgentReplied}
                            />

                            {hasReplies && (
                                <div className={cn(
                                    "ml-[12px] border-l-2 border-border relative pt-2",
                                    "pl-8" // Pushes children to create the "arm" space
                                )}>
                                    {replies.map((reply) => (
                                        <CommentNode
                                            key={reply.id}
                                            comment={reply}
                                            replies={repliesByParentId[reply.id] || []}
                                            repliesByParentId={repliesByParentId}
                                            depth={depth + 1}

                                            onReply={onReply}
                                            onAgentReplied={onAgentReplied}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
