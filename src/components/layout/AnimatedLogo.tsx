import React, { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedLogoProps {
    className?: string
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ className }) => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [isBlinking, setIsBlinking] = useState(false)
    const containerRef = useRef<SVGSVGElement>(null)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2

            // Calculate distance and angle
            const dx = e.clientX - centerX
            const dy = e.clientY - centerY
            const angle = Math.atan2(dy, dx)
            const distance = Math.min(Math.sqrt(dx * dx + dy * dy) / 100, 1.5) // Max offset of 1.5 units

            setMousePos({
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance
            })
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    useEffect(() => {
        const blink = () => {
            setIsBlinking(true)
            setTimeout(() => setIsBlinking(false), 150)

            // Random interval for next blink
            const nextBlink = Math.random() * 4000 + 2000
            setTimeout(blink, nextBlink)
        }

        const initialTimeout = setTimeout(blink, 3000)
        return () => clearTimeout(initialTimeout)
    }, [])

    return (
        <svg
            ref={containerRef}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("lucide lucide-bot transition-transform duration-300", className)}
        >
            {/* Antenna */}
            <path d="M12 8V4H8" />

            {/* Body */}
            <rect width="16" height="12" x="4" y="8" rx="2" />

            {/* Side connectors */}
            <path d="M2 14h2" />
            <path d="M20 14h2" />

            {/* Left Eye */}
            <g transform={`translate(${mousePos.x} ${mousePos.y})`}>
                {!isBlinking ? (
                    <path d="M9 13v2" className="transition-all duration-75" />
                ) : (
                    <path d="M8.5 14h1" className="transition-all duration-75" />
                )}
            </g>

            {/* Right Eye */}
            <g transform={`translate(${mousePos.x} ${mousePos.y})`}>
                {!isBlinking ? (
                    <path d="M15 13v2" className="transition-all duration-75" />
                ) : (
                    <path d="M14.5 14h1" className="transition-all duration-75" />
                )}
            </g>
        </svg>
    )
}
