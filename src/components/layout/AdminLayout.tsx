import React, { useEffect, useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import { AdminSidebar } from './AdminSidebar'
import { Menu } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export const AdminLayout: React.FC = () => {
    const { user, loading } = useAuth()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [checkingAdmin, setCheckingAdmin] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (!user) {
                setCheckingAdmin(false)
                return
            }

            // Primary check: Email
            if (user.email === 'rajapraveensir@gmail.com') {
                setIsAdmin(true)
                setCheckingAdmin(false)
                return
            }

            // Secondary check: Database (for robustness)
            const { data, error } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', user.id)
                .single()

            if (!error && data?.is_admin) {
                setIsAdmin(true)
            } else {
                setIsAdmin(false)
            }
            setCheckingAdmin(false)
        }

        checkAdminStatus()
    }, [user])

    if (loading || checkingAdmin) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center space-y-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground">Verifying Admin Access...</p>
                </div>
            </div>
        )
    }

    if (!user || !isAdmin) {
        return <Navigate to="/home" replace />
    }

    return (
        <div className="flex min-h-screen bg-background">
            <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-200">
                {/* Mobile Header */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-sm md:hidden">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-muted-foreground hover:text-foreground"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <span className="text-lg font-semibold">Admin Panel</span>
                </header>

                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
