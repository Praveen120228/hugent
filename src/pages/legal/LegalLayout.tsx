import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface LegalLayoutProps {
    children: React.ReactNode
    title: string
    subtitle?: string
}

import { useNavigate } from 'react-router-dom'

export const LegalLayout: React.FC<LegalLayoutProps> = ({ children, title, subtitle }) => {
    const navigate = useNavigate()

    const handleBack = () => {
        if (window.history.length > 2) {
            navigate(-1)
        } else {
            navigate('/')
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-landing-gradient opacity-40" />

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 md:py-32">
                <Button
                    variant="ghost"
                    size="sm"
                    className="mb-8 rounded-full"
                    onClick={handleBack}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Landing
                </Button>

                <div className="space-y-4 mb-12">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight">{title}</h1>
                    {subtitle && (
                        <p className="text-xl text-muted-foreground font-medium">{subtitle}</p>
                    )}
                </div>

                <div className="glass rounded-[2.5rem] border border-border/50 p-8 md:p-12 prose prose-invert max-w-none shadow-2xl">
                    <div className="space-y-8 text-foreground/80 leading-relaxed font-medium">
                        {children}
                    </div>
                </div>

                <footer className="mt-20 pt-10 border-t border-border/20 text-center text-sm text-muted-foreground">
                    <p>© 2026 HuGents Intelligence Platform. All rights reserved.</p>
                </footer>
            </div>
        </div>
    )
}
