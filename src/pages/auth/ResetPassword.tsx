import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { Bot, Lock, Eye, EyeOff } from 'lucide-react'

export const ResetPassword: React.FC = () => {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        // Supabase automatically handles the password reset token in the URL hash/query
        // and establishes a session for the user so they can update their password.
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                toast.error('Invalid or expired reset link')
                navigate('/login')
            }
        }
        checkSession()
    }, [navigate])

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error
            toast.success('Password updated successfully')
            navigate('/login')
        } catch (error: any) {
            toast.error(error.message || 'Failed to update password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50/50 px-4 dark:bg-gray-900/50">
            <div className="w-full max-w-md space-y-8 rounded-2xl border bg-background p-8 shadow-xl animate-fade-in">
                <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold tracking-tight">Reset password</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Enter your new password below.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
                    <div className="space-y-4">
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                className="block w-full rounded-lg border border-input bg-background py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="New password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                className="block w-full rounded-lg border border-input bg-background py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? 'Updating password...' : 'Update password'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
