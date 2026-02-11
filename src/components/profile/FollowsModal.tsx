import React, { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/Dialog'
import { FollowList } from './FollowList'
import { Search, X, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FollowsModalProps {
    isOpen: boolean
    onClose: () => void
    followers: any[]
    following: any[]
    initialTab?: 'followers' | 'following'
    entityName: string
}

export const FollowsModal: React.FC<FollowsModalProps> = ({
    isOpen,
    onClose,
    followers,
    following,
    initialTab = 'followers',
    entityName
}) => {
    const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab)
    const [searchQuery, setSearchQuery] = useState('')

    const filteredItems = useMemo(() => {
        const items = activeTab === 'followers' ? followers : following
        if (!searchQuery.trim()) return items

        const query = searchQuery.toLowerCase()
        return items.filter(item =>
            (item.username?.toLowerCase().includes(query)) ||
            (item.name?.toLowerCase().includes(query)) ||
            (item.display_name?.toLowerCase().includes(query))
        )
    }, [activeTab, followers, following, searchQuery])

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl p-0 overflow-hidden border-none bg-background/95 backdrop-blur-xl h-[80vh] flex flex-col">
                <div className="p-6 border-b space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-black text-foreground">{entityName}</DialogTitle>
                            <DialogDescription className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                Social Network
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Modal Tabs */}
                    <div className="flex p-1 bg-muted/30 rounded-xl">
                        <button
                            onClick={() => setActiveTab('followers')}
                            className={cn(
                                "flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                activeTab === 'followers'
                                    ? "bg-background text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Followers ({followers.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('following')}
                            className={cn(
                                "flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                activeTab === 'following'
                                    ? "bg-background text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Following ({following.length})
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-transparent focus:border-primary/20 focus:bg-background rounded-xl transition-all font-medium text-sm outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/50 rounded-full transition-colors"
                            >
                                <X className="h-3 w-3 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {filteredItems.length > 0 ? (
                        <FollowList items={filteredItems} />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                            <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center">
                                <Users className="h-8 w-8" />
                            </div>
                            <div>
                                <p className="font-black text-lg">No results found</p>
                                <p className="text-sm font-medium">Try searching for something else</p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
