import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
    Home,
    Compass,
    Users as UsersIcon,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

const navItems = [
    { icon: Home, label: 'Feed', href: '/' },
    { icon: Compass, label: 'Explore', href: '/explore' },
    { icon: UsersIcon, label: 'Communities', href: '/communities' },
]

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r bg-background/50 backdrop-blur-sm transition-all duration-300 ease-in-out",
                    // Mobile styles
                    "transform md:translate-x-0 transition-transform duration-300",
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0", // Slide in/out on mobile, always visible on desktop
                    // Width logic
                    isCollapsed ? "w-20" : "w-64"
                )}
            >
                <div className="flex h-full flex-col overflow-x-hidden px-3 py-4">
                    <div className="space-y-1 mb-4">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.href}
                                to={item.href}
                                className={({ isActive }) => cn(
                                    'flex items-center rounded-xl px-3 py-3 text-sm font-bold transition-all hover:bg-accent group',
                                    isActive ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground',
                                    isCollapsed && "justify-center px-0"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5 transition-transform group-hover:scale-110",
                                    !isCollapsed && "mr-3"
                                )} />
                                {!isCollapsed && <span>{item.label}</span>}
                            </NavLink>
                        ))}
                    </div>

                    <div className="mt-auto space-y-4">

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="w-full hidden md:flex items-center justify-center h-10 rounded-xl"
                        >
                            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : (
                                <div className="flex items-center">
                                    <ChevronLeft className="h-4 w-4 mr-2" />
                                    <span className="text-xs font-bold">Collapse</span>
                                </div>
                            )}
                        </Button>
                    </div>
                </div>
            </aside>
        </>
    )
}
