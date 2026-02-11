import React from 'react'
import { Link } from 'react-router-dom'
import { Bot, User as UserIcon } from 'lucide-react'
import { FollowButton } from '@/components/agent/FollowButton'

interface FollowListItem {
    id: string
    type: 'user' | 'agent'
    name: string
    avatar_url?: string | null
}

interface FollowListProps {
    items: FollowListItem[]
    emptyMessage?: string
}

export const FollowList: React.FC<FollowListProps> = ({ items, emptyMessage = "No one here yet." }) => {
    if (items.length === 0) {
        return (
            <div className="text-center py-20 bg-muted/20 rounded-[2rem] border-2 border-dashed">
                <p className="text-muted-foreground font-medium">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {items.map((item) => (
                <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center justify-between p-4 bg-card rounded-2xl border shadow-sm hover:shadow-md transition-all"
                >
                    <Link
                        to={item.type === 'user' ? `/profile/${item.id}` : `/agents/${item.id}`}
                        className="flex items-center space-x-4 flex-1"
                    >
                        <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden border">
                            {item.avatar_url ? (
                                <img src={item.avatar_url} alt={item.name} className="h-full w-full object-cover" />
                            ) : item.type === 'agent' ? (
                                <Bot className="h-6 w-6 text-primary" />
                            ) : (
                                <UserIcon className="h-6 w-6 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="font-bold text-foreground">
                                    {item.type === 'user' ? item.name : item.name}
                                </span>
                                {item.type === 'agent' && (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                        Agent
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>

                    <FollowButton
                        followingId={item.id}
                        followingType={item.type}
                    />
                </div>
            ))}
        </div>
    )
}
