import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Plus, Loader2, Bookmark } from 'lucide-react'
import { collectionService, type Collection } from '@/services/collection.service'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'

interface SaveToCollectionModalProps {
    isOpen: boolean
    onClose: () => void
    postId: string
    onSave?: () => void
}

export const SaveToCollectionModal: React.FC<SaveToCollectionModalProps> = ({ isOpen, onClose, postId, onSave }) => {
    const { user } = useAuth()
    const [collections, setCollections] = useState<Collection[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null) // Collection ID being saved to
    const [newCollectionName, setNewCollectionName] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [creatingLoader, setCreatingLoader] = useState(false)

    useEffect(() => {
        if (isOpen && user) {
            loadCollections()
        }
    }, [isOpen, user])

    const loadCollections = async () => {
        if (!user) return
        setLoading(true)
        try {
            const data = await collectionService.getCollections(user.id)
            setCollections(data)
        } catch (error) {
            console.error('Failed to load collections:', error)
            toast.error('Failed to load collections')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) return
        setCreatingLoader(true)
        try {
            const newCollection = await collectionService.createCollection(newCollectionName)
            setCollections([newCollection, ...collections])
            setNewCollectionName('')
            setIsCreating(false)
            toast.success('Collection created')
            // Optionally auto-save to new collection
            handleSave(newCollection.id)
        } catch (error) {
            console.error('Failed to create collection:', error)
            toast.error('Failed to create collection')
        } finally {
            setCreatingLoader(false)
        }
    }

    const handleSave = async (collectionId: string) => {
        setSaving(collectionId)
        try {
            await collectionService.saveItem(postId, collectionId)
            toast.success('Saved to collection')
            onSave?.()
            onClose()
        } catch (error: any) {
            if (error.message === 'Item already saved to this collection') {
                toast.info('Already saved to this collection')
            } else {
                console.error('Failed to save item:', error)
                toast.error('Failed to save item')
            }
        } finally {
            setSaving(null)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden bg-card border-border shadow-2xl">
                <div className="p-6 pb-2">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Bookmark className="w-5 h-5 text-primary" />
                        Save to Collection
                    </DialogTitle>
                </div>

                <div className="max-h-[300px] overflow-y-auto px-6 py-2 space-y-2">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : collections.length === 0 && !isCreating ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            No collections yet. Create one to organize your saved items.
                        </div>
                    ) : (
                        collections.map(collection => (
                            <button
                                key={collection.id}
                                onClick={() => handleSave(collection.id)}
                                disabled={saving !== null}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group text-left"
                            >
                                <span className="font-medium truncate">{collection.name}</span>
                                {saving === collection.id && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                            </button>
                        ))
                    )}
                </div>

                <div className="p-4 border-t bg-muted/20">
                    {isCreating ? (
                        <div className="space-y-3">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Collection name"
                                value={newCollectionName}
                                onChange={e => setNewCollectionName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                                onKeyDown={e => e.key === 'Enter' && handleCreateCollection()}
                            />
                            <div className="flex justify-end gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={handleCreateCollection}
                                    disabled={!newCollectionName.trim() || creatingLoader}
                                >
                                    {creatingLoader ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-primary font-bold hover:bg-primary/10 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Collection
                        </button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
