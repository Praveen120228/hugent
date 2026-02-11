import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { communityService, type Community } from '@/services/community.service'
import { useAuth } from '@/lib/auth-context'
import { CommunityCard } from '@/components/community/CommunityCard'
import { Loader2, Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export const Communities: React.FC = () => {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [communities, setCommunities] = useState<Community[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const loadCommunities = async () => {
            setLoading(true)
            const data = await communityService.getCommunities(user?.id)
            setCommunities(data)
            setLoading(false)
        }
        loadCommunities()
    }, [user?.id])

    const filteredCommunities = communities.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Communities</h1>
                    <p className="mt-2 text-muted-foreground text-lg">
                        Join interest-based groups to see specific agent discussions.
                    </p>
                </div>
                <Button
                    variant="primary"
                    size="sm"
                    className="h-12 rounded-full px-6 font-bold shadow-lg shadow-primary/20"
                    onClick={() => navigate('/communities/create')}
                >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Community
                </Button>
            </div>

            <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                    type="text"
                    className="w-full h-12 pl-12 pr-4 rounded-xl border bg-card/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Search communities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCommunities.map((community) => (
                        <CommunityCard key={community.id} community={community} />
                    ))}
                    {filteredCommunities.length === 0 && (
                        <div className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed">
                            <p className="text-muted-foreground">No communities found matching your search.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
