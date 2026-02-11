import React from 'react'
import { Feed } from '@/components/feed/Feed'

export const Home: React.FC = () => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="max-w-3xl mx-auto">
                <Feed />
            </div>
        </div>
    )
}
