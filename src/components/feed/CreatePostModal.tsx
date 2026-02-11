import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { postService } from '@/services/post.service'
import { useAuth } from '@/lib/auth-context'
import { storageService } from '@/services/storage.service'
import { Loader2, Sparkles, Image as ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'

interface CreatePostModalProps {
    isOpen: boolean
    onClose: () => void
    communityId?: string
    communityName?: string
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, communityId, communityName }) => {
    const { user } = useAuth()
    const [subject, setSubject] = useState('')
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) {
            setSubject('')
            setContent('')
            setImageFile(null)
            setImagePreview(null)
        }
    }, [isOpen])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImageFile(file)
            setImagePreview(URL.createObjectURL(file))
        }
    }

    const handleCreate = async () => {
        if (!user || !subject.trim() || !content.trim()) return
        setLoading(true)
        try {
            let mediaUrl = undefined
            let postType: 'text' | 'image' | 'link' = 'text'

            if (imageFile) {
                const path = `posts/${user.id}/${Date.now()}-${imageFile.name}`
                mediaUrl = await storageService.uploadFile('post-media', path, imageFile)
                postType = 'image'
            }

            await postService.createPost(
                undefined, // agentId
                content,
                undefined,
                undefined,
                0,
                communityId,
                postType,
                mediaUrl,
                undefined,
                user.id, // profileId
                subject // title
            )
            toast.success('Post created successfully!')
            setSubject('')
            setContent('')
            setImageFile(null)
            setImagePreview(null)
            onClose()
        } catch (error: any) {
            toast.error(error.message || 'Failed to create post')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <div className="space-y-6">
                    <div className="flex items-center space-x-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <DialogTitle className="text-2xl font-bold tracking-tight">Create Post</DialogTitle>
                            <DialogDescription className="sr-only">
                                Create a new post to share with the community.
                            </DialogDescription>
                            <p className="text-xs font-bold text-muted-foreground">
                                {communityName ? `Posting to c/${communityName}` : 'Posting to Portal (Open Feed)'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Subject</label>
                            <input
                                type="text"
                                className="w-full h-12 px-4 rounded-xl border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                                placeholder="What's this about?"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Content</label>
                            <textarea
                                className="w-full min-h-[120px] p-4 rounded-xl border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-sm"
                                placeholder="What's on your mind?"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                            />
                        </div>

                        {imagePreview && (
                            <div className="relative rounded-xl overflow-hidden border aspect-video bg-muted/20">
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                                <button
                                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-foreground hover:bg-background shadow-sm"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center space-x-2">
                            <input
                                type="file"
                                id="image-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                            <label
                                htmlFor="image-upload"
                                className="flex items-center space-x-2 px-3 py-2 rounded-lg border-2 border-dashed border-primary/20 hover:border-primary/40 cursor-pointer transition-all text-xs font-bold text-primary"
                            >
                                <ImageIcon className="h-4 w-4" />
                                <span>{imageFile ? 'Change Image' : 'Add Image'}</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                        <Button variant="ghost" onClick={onClose} className="flex-1 font-bold">Cancel</Button>
                        <Button
                            variant="primary"
                            onClick={handleCreate}
                            disabled={loading || !subject.trim() || !content.trim()}
                            className="flex-1 font-bold shadow-lg shadow-primary/20"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post Now'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
