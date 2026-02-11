import React, { useState, useEffect } from 'react'
import { collectionService, type Collection, type SavedItem } from '@/services/collection.service'
import { useAuth } from '@/lib/auth-context'
import { PostCard } from '@/components/feed/PostCard'
import { Loader2, Folder, Clock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export const SavedItems = () => {
    const { user } = useAuth()
    const [collections, setCollections] = useState<Collection[]>([])
    const [, setSavedItems] = useState<SavedItem[]>([])
    const [loading, setLoading] = useState(true)
    const [itemsLoading, setItemsLoading] = useState(false)
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null) // null means all

    // We need to fetch full post details for each saved item
    const [hydratedPosts, setHydratedPosts] = useState<any[]>([])

    useEffect(() => {
        if (user) {
            loadCollections()
            loadSavedItems()
        }
    }, [user])

    useEffect(() => {
        if (selectedCollection !== undefined) {
            loadSavedItems(selectedCollection || undefined)
        }
    }, [selectedCollection])

    const loadCollections = async () => {
        try {
            const data = await collectionService.getCollections(user!.id)
            setCollections(data)
        } catch (error) {
            console.error('Failed to load collections', error)
        }
    }

    const loadSavedItems = async (collectionId?: string) => {
        setItemsLoading(true)
        try {
            const items = await collectionService.getSavedItems(collectionId)
            setSavedItems(items)

            // Fetch post details for all items
            // Effectively we need to use postService or Supabase to get posts by IDs
            // Since we don't have a bulk get, we might need to rely on the join in getSavedItems 
            // BUT getSavedItems definition in service used `select('*, post:posts(*)')`
            // So `post` object should already be there!

            // However, `sections` in `post` might be missing if we just used `*`. 
            // Let's assume basic post info is there. If we need profiles/agents we might need a better query or just use what we have.
            // The `SavedItem` interface in service didn't strictly type `post`.

            // Check if post data is sufficient. If not, we might need to fetch.
            // For now, let's use the data returned by the service join.
            // We need to map it to the structure PostCard expects.

            const posts = items.map(item => item.post).filter(p => !!p)
            setHydratedPosts(posts)

        } catch (error) {
            console.error('Failed to load saved items', error)
        } finally {
            setItemsLoading(false)
            setLoading(false)
        }
    }

    const handleDeleteCollection = async (e: React.MouseEvent, collectionId: string) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this collection? items will be unsaved from this collection.')) return
        try {
            await collectionService.deleteCollection(collectionId)
            setCollections(collections.filter(c => c.id !== collectionId))
            if (selectedCollection === collectionId) {
                setSelectedCollection(null)
            }
            toast.success('Collection deleted')
        } catch (error) {
            toast.error('Failed to delete collection')
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="container max-w-4xl py-6 md:py-10">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar / Collections List */}
                <div className="w-full md:w-64 flex-shrink-0 space-y-4">
                    <h2 className="font-bold text-xl px-2">Collections</h2>
                    <div className="space-y-1">
                        <button
                            onClick={() => setSelectedCollection(null)}
                            className={cn(
                                "w-full flex items-center space-x-3 px-4 py-2 rounded-xl transition-colors font-medium",
                                selectedCollection === null ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                            )}
                        >
                            <Clock className="w-4 h-4" />
                            <span>All Saved Items</span>
                        </button>
                        {collections.map(collection => (
                            <button
                                key={collection.id}
                                onClick={() => setSelectedCollection(collection.id)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-2 rounded-xl transition-colors font-medium group",
                                    selectedCollection === collection.id ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                                )}
                            >
                                <div className="flex items-center space-x-3 truncate">
                                    <Folder className="w-4 h-4" />
                                    <span className="truncate">{collection.name}</span>
                                </div>
                                <div
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded-full text-destructive transition-all"
                                    onClick={(e) => handleDeleteCollection(e, collection.id)}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content / Saved Posts */}
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold mb-6">
                        {selectedCollection ? collections.find(c => c.id === selectedCollection)?.name : 'All Saved Items'}
                    </h1>

                    {itemsLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : hydratedPosts.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-2xl bg-muted/5">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Folder className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <h3 className="font-bold text-lg">No items found</h3>
                            <p className="text-muted-foreground">Items you save will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {hydratedPosts.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
