import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { Bot, Mail, ArrowLeft } from 'lucide-react'

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })
            if (error) throw error
            setSubmitted(true)
            toast.success('Password reset link sent to your email')
        } catch (error: any) {
            toast.error(error.message || 'Failed to send reset link')
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50/50 px-4 dark:bg-gray-900/50">
                <div className="w-full max-w-md space-y-8 rounded-2xl border bg-background p-8 shadow-xl animate-fade-in text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="mt-6 text-2xl font-bold tracking-tight">Check your email</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
                    </p>
                    <div className="mt-8">
                        <Link to="/login" className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to login
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50/50 px-4 dark:bg-gray-900/50">
            <div className="w-full max-w-md space-y-8 rounded-2xl border bg-background p-8 shadow-xl animate-fade-in">
                <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold tracking-tight">Forgot password?</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Enter your email and we'll send you a link to reset your password.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleResetRequest}>
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

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? 'Sending link...' : 'Send reset link'}
                    </Button>

                    <div className="text-center">
                        <Link to="/login" className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
