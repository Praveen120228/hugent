import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, matchPath } from 'react-router-dom'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/Button'
import { User as UserIcon, LogOut, Plus, Settings, ChevronDown, Sun, Moon, Monitor, Menu, Bookmark, Search, ArrowLeft } from 'lucide-react'
import { CreatePostModal } from '@/components/feed/CreatePostModal'
import { UniversalSearch } from './UniversalSearch'
import { NotificationCenter } from './NotificationCenter'
import { AnimatedLogo } from './AnimatedLogo'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme-context'
import { profileService, type Profile } from '@/services/profile.service'
import { communityService } from '@/services/community.service'
import { useOnClickOutside } from '@/hooks/use-on-click-outside'
import { useScrollbarWidth } from '@/hooks/use-scrollbar-width'

interface NavbarProps {
    onMenuClick: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    const { user, signOut } = useAuth()
    const { theme, setTheme } = useTheme()
    const [isPostModalOpen, setIsPostModalOpen] = useState(false)
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
    const [profile, setProfile] = useState<Profile | null>(null)
    const location = useLocation()
    const [activeCommunity, setActiveCommunity] = useState<{ id: string; name: string } | null>(null)
    const profileMenuRef = useRef<HTMLDivElement>(null)
    const scrollbarWidth = useScrollbarWidth()

    useOnClickOutside(profileMenuRef, () => setIsProfileMenuOpen(false))

    // Close search on navigation
    useEffect(() => {
        setIsMobileSearchOpen(false)
    }, [location.pathname])

    useEffect(() => {
        if (user) {
            profileService.getProfile(user.id).then(setProfile)
        }
    }, [user])

    useEffect(() => {
        const communityMatch = matchPath('/communities/:slug', location.pathname)
        if (communityMatch?.params.slug) {
            communityService.getCommunityBySlug(communityMatch.params.slug).then(comm => {
                if (comm) {
                    setActiveCommunity({ id: comm.id, name: comm.name })
                } else {
                    setActiveCommunity(null)
                }
            })
        } else {
            setActiveCommunity(null)
        }
    }, [location.pathname])

    return (
        <nav
            className="fixed top-0 z-[100] w-full border-b bg-background/80 backdrop-blur-md transition-all duration-200"
            style={{ paddingRight: isPostModalOpen ? `${scrollbarWidth}px` : '0px' }}
        >
            <div className="flex h-16 w-full items-center justify-between px-4 sm:px-8 lg:px-12">
                {!isMobileSearchOpen ? (
                    <>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onMenuClick}>
                                <Menu className="h-6 w-6" />
                            </Button>
                            <Link to="/" className="flex items-center space-x-2 shrink-0">
                                <AnimatedLogo className="h-8 w-8 text-primary" />
                                <span className="text-xl font-bold tracking-tight hidden sm:block">HuGents</span>
                            </Link>
                        </div>

                        <div className="flex-1 max-w-2xl mx-4 sm:mx-12 hidden md:block">
                            <UniversalSearch />
                        </div>

                        <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden hover:bg-primary/5 transition-colors"
                                onClick={() => setIsMobileSearchOpen(true)}
                            >
                                <Search className="h-5 w-5 text-muted-foreground" />
                            </Button>

                            {user ? (
                                <>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="hidden md:flex font-bold rounded-full"
                                        onClick={() => setIsPostModalOpen(true)}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Post
                                    </Button>

                                    <NotificationCenter />

                                    <div className="relative" ref={profileMenuRef}>
                                        <button
                                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                            className="flex items-center space-x-2 rounded-full bg-muted/50 hover:bg-muted px-3 py-1.5 border border-transparent hover:border-primary/20 transition-all group"
                                        >
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden">
                                                {profile?.avatar_url ? (
                                                    <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                                ) : (
                                                    <UserIcon className="h-3.5 w-3.5" />
                                                )}
                                            </div>
                                            <span className="text-sm font-bold tracking-tight hidden sm:block">{profile?.username || user.email?.split('@')[0]}</span>
                                            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", isProfileMenuOpen && "rotate-180")} />
                                        </button>

                                        {isProfileMenuOpen && (
                                            <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-input bg-background p-2 shadow-2xl z-20 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                                <Link
                                                    to="/profile"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                    className="flex items-center w-full px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors group"
                                                >
                                                    <UserIcon className="mr-3 h-4 w-4" />
                                                    Profile
                                                </Link>
                                                <Link
                                                    to="/saved"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                    className="flex items-center w-full px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors group"
                                                >
                                                    <Bookmark className="mr-3 h-4 w-4" />
                                                    Saved Items
                                                </Link>
                                                <Link
                                                    to="/settings"
                                                    onClick={() => setIsProfileMenuOpen(false)}
                                                    className="flex items-center w-full px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors group text-nowrap"
                                                >
                                                    <Settings className="mr-3 h-4 w-4 transition-transform group-hover:rotate-45" />
                                                    Settings
                                                </Link>
                                                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-t mt-1">
                                                    Theme
                                                </div>
                                                <div className="flex px-2 pb-2 space-x-1">
                                                    <button
                                                        onClick={() => setTheme('light')}
                                                        className={cn(
                                                            "flex-1 flex flex-col items-center justify-center py-2 rounded-xl border transition-all",
                                                            theme === 'light' ? "bg-primary/10 border-primary/20 text-primary" : "text-muted-foreground hover:bg-accent border-transparent"
                                                        )}
                                                    >
                                                        <Sun className="h-4 w-4 mb-1" />
                                                        <span className="text-[10px] font-bold">Light</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setTheme('dark')}
                                                        className={cn(
                                                            "flex-1 flex flex-col items-center justify-center py-2 rounded-xl border transition-all",
                                                            theme === 'dark' ? "bg-primary/10 border-primary/20 text-primary" : "text-muted-foreground hover:bg-accent border-transparent"
                                                        )}
                                                    >
                                                        <Moon className="h-4 w-4 mb-1" />
                                                        <span className="text-[10px] font-bold">Dark</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setTheme('system')}
                                                        className={cn(
                                                            "flex-1 flex flex-col items-center justify-center py-2 rounded-xl border transition-all",
                                                            theme === 'system' ? "bg-primary/10 border-primary/20 text-primary" : "text-muted-foreground hover:bg-accent border-transparent"
                                                        )}
                                                    >
                                                        <Monitor className="h-4 w-4 mb-1" />
                                                        <span className="text-[10px] font-bold">System</span>
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        signOut()
                                                        setIsProfileMenuOpen(false)
                                                    }}
                                                    className="flex items-center w-full px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 rounded-xl transition-colors border-t mt-1"
                                                >
                                                    <LogOut className="mr-3 h-4 w-4" />
                                                    Sign Out
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Link to="/login">
                                        <Button variant="ghost" size="sm">Log in</Button>
                                    </Link>
                                    <Link to="/signup">
                                        <Button variant="primary" size="sm">Sign up</Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-1 items-center space-x-4 h-full animate-in slide-in-from-top-4 duration-300">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMobileSearchOpen(false)}
                            className="shrink-0"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex-1">
                            <UniversalSearch autoFocus />
                        </div>
                    </div>
                )}
            </div>
            <CreatePostModal
                isOpen={isPostModalOpen}
                onClose={() => setIsPostModalOpen(false)}
                communityId={activeCommunity?.id}
                communityName={activeCommunity?.name}
            />
        </nav>
    )
}
