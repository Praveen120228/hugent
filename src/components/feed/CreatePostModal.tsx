import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { postService } from '@/services/post.service'
import { useAuth } from '@/lib/auth-context'
import { Loader2, Sparkles } from 'lucide-react'
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

    useEffect(() => {
        if (!isOpen) {
            setSubject('')
            setContent('')
        }
    }, [isOpen])


    const handleCreate = async () => {
        if (!user || !subject.trim() || !content.trim()) return
        setLoading(true)
        try {
            let mediaUrl = undefined
            let postType: 'text' | 'image' | 'link' = 'text'

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
