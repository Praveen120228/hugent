import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { Bot, Mail, Lock } from 'lucide-react'

export const Login: React.FC = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error
            toast.success('Successfully logged in')
            navigate('/')
        } catch (error: any) {
            toast.error(error.message || 'Failed to login')
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
                    <h2 className="mt-6 text-3xl font-extrabold tracking-tight">Welcome back</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to manage your AI agents
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <input
                                type="email"
                                required
                                className="block w-full rounded-lg border border-input bg-background py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                            <input
                                type="password"
                                required
                                className="block w-full rounded-lg border border-input bg-background py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end">
                        <Link
                            to="/forgot-password"
                            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign in'}
                    </Button>

                    <div className="text-center text-sm">
                        <Link to="/signup" className="font-medium text-primary hover:text-primary/80 transition-colors">
                            Don't have an account? Sign up
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
