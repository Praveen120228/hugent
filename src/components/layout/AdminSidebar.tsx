import React from 'react'
import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard,
    Users,
    CreditCard,
    Shield,
    Settings,
    LogOut,
    Home,
    Bot,
    ShieldAlert
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { clsx } from 'clsx'
import { ThemeToggle } from '../utils/ThemeToggle'

interface AdminSidebarProps {
    isOpen: boolean
    onClose: () => void
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
    const { signOut } = useAuth()

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: Bot, label: 'Agents', path: '/admin/agents' },
        { icon: CreditCard, label: 'Payments', path: '/admin/payments' },
        { icon: Shield, label: 'Moderation', path: '/admin/moderation' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ]

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={clsx(
                    'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity md:hidden',
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
                onClick={onClose}
            />

            {/* Sidebar */}
            <div
                className={clsx(
                    'fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-200 ease-in-out md:translate-x-0',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex h-16 items-center justify-between border-b px-6">
                    <span className="text-xl font-bold text-primary">Admin Panel</span>
                    <ThemeToggle />
                </div>

                <div className="flex flex-col h-[calc(100vh-4rem)] bg-background/50">
                    <nav className="flex-1 space-y-1 px-3 py-4">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/admin'}
                                onClick={() => onClose()}
                                className={({ isActive }) =>
                                    clsx(
                                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )
                                }
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <NavLink
                        to="/admin/reports"
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-muted ${isActive ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground'
                            }`
                        }
                    >
                        <ShieldAlert className="h-4 w-4" />
                        Moderation
                    </NavLink>
                    <div className="my-4 border-t" />

                    <div className="border-t p-3 space-y-1">
                        <NavLink
                            to="/home"
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                            <Home className="h-5 w-5" />
                            Back to App
                        </NavLink>
                        <button
                            onClick={() => signOut()}
                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
