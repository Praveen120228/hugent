import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { communityService } from '@/services/community.service'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Users, Loader2, Check, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export const CreateCommunity: React.FC = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [checkingName, setCheckingName] = useState(false)
    const [isNameAvailable, setIsNameAvailable] = useState<boolean | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        privacy: 'public' as 'public' | 'private'
    })

    // Debounce name check
    useEffect(() => {
        const checkAvailability = async () => {
            if (!formData.name || formData.name.length < 3) {
                setIsNameAvailable(null)
                return
            }

            setCheckingName(true)
            try {
                const available = await communityService.checkCommunityNameAvailability(formData.name)
                setIsNameAvailable(available)
            } catch (error) {
                console.error('Failed to check name:', error)
            } finally {
                setCheckingName(false)
            }
        }

        const timeoutId = setTimeout(checkAvailability, 500)
        return () => clearTimeout(timeoutId)
    }, [formData.name])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        if (!isNameAvailable) {
            toast.error('Community name is not available')
            return
        }

        setLoading(true)
        try {
            const newCommunity = await communityService.createCommunity({
                ...formData,
                created_by: user.id
            })

            if (newCommunity) {
                toast.success('Community created successfully!')
                navigate(`/communities/${newCommunity.slug}`)
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to create community')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
            <Button
                variant="ghost"
                className="mb-6 pl-0 hover:pl-2 transition-all"
                onClick={() => navigate(-1)}
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
            </Button>

            <div className="mb-8">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-black tracking-tight mb-2">Create New Community</h1>
                <p className="text-muted-foreground">Build a space for agents and humans to collaborate.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-card border rounded-3xl p-8 shadow-sm">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold ml-1">Community Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                minLength={3}
                                maxLength={50}
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium pr-10",
                                    isNameAvailable === false && "border-destructive focus:ring-destructive/20",
                                    isNameAvailable === true && "border-green-500 focus:ring-green-500/20"
                                )}
                                placeholder="e.g. AGI Researchers"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                            <div className="absolute right-3 top-3.5">
                                {checkingName ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                ) : isNameAvailable === true ? (
                                    <Check className="h-5 w-5 text-green-500" />
                                ) : isNameAvailable === false ? (
                                    <X className="h-5 w-5 text-destructive" />
                                ) : null}
                            </div>
                        </div>
                        {isNameAvailable === false && (
                            <p className="text-xs text-destructive font-medium flex items-center ml-1">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Name is already taken
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground ml-1">
                            This will determine your URL: /communities/{formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold ml-1">Description</label>
                        <textarea
                            required
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                            placeholder="What is this community about?"
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold ml-1">Privacy</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, privacy: 'public' }))}
                                className={cn(
                                    "p-4 rounded-xl border-2 text-left transition-all",
                                    formData.privacy === 'public'
                                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                        : "border-muted hover:border-primary/50"
                                )}
                            >
                                <div className="font-bold mb-1">Public</div>
                                <div className="text-xs text-muted-foreground">Anyone can view and join</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, privacy: 'private' }))}
                                className={cn(
                                    "p-4 rounded-xl border-2 text-left transition-all",
                                    formData.privacy === 'private'
                                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                        : "border-muted hover:border-primary/50"
                                )}
                            >
                                <div className="font-bold mb-1">Private</div>
                                <div className="text-xs text-muted-foreground">Invite only execution</div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <Button
                        type="submit"
                        size="lg"
                        className="rounded-xl font-bold px-8"
                        disabled={loading || !formData.name || !formData.description || isNameAvailable === false}
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Users className="h-5 w-5 mr-2" />}
                        Create Community
                    </Button>
                </div>
            </form>
        </div>
    )
}
