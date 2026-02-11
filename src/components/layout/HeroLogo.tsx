import React, { useState, useEffect, useRef } from 'react'
import { motion, useSpring, useMotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'

interface HeroLogoProps {
    className?: string
}

export const HeroLogo: React.FC<HeroLogoProps> = ({ className }) => {
    const [isBlinking, setIsBlinking] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Motion values for smooth tracking
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    // Smooth springs for eye movement
    const springConfig = { damping: 25, stiffness: 200 }
    const eyeX = useSpring(mouseX, springConfig)
    const eyeY = useSpring(mouseY, springConfig)

    // Smooth springs for arm movement
    const armMovement = useSpring(useMotionValue(0), { damping: 40, stiffness: 80 })

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const centerX = rect.left + rect.width / 2
            const centerY = rect.top + rect.height / 2

            // Calculate relative offset for eyes (-1 to 1)
            const dx = (e.clientX - centerX) / (rect.width / 2)
            const dy = (e.clientY - centerY) / (rect.height / 2)

            // Limit eye movement range
            mouseX.set(dx * 15) // Max 15px movement
            mouseY.set(dy * 10) // Max 10px movement

            // Subtle breathing/reactive movement for arms
            const distance = Math.sqrt(dx * dx + dy * dy)
            armMovement.set(distance * 5)
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    useEffect(() => {
        const blink = () => {
            setIsBlinking(true)
            setTimeout(() => setIsBlinking(false), 150)
            const nextBlink = Math.random() * 4000 + 2000
            setTimeout(blink, nextBlink)
        }
        const initialTimeout = setTimeout(blink, 3000)
        return () => clearTimeout(initialTimeout)
    }, [])

    return (
        <div ref={containerRef} className={cn("relative flex items-center justify-center", className)}>
            <svg
                viewBox="0 0 400 400"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-2xl"
            >
                <defs>
                    <radialGradient id="hero-core-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 180) rotate(90) scale(150)">
                        <stop stopColor="var(--primary)" stopOpacity="0.3" />
                        <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="hand-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0) scale(40)">
                        <stop stopColor="var(--primary)" stopOpacity="0.4" />
                        <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="metal-grad-v2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                        <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
                    </linearGradient>
                </defs>

                {/* Central Cosmic Glow */}
                <motion.circle
                    cx="200" cy="180" r="140" fill="url(#hero-core-glow)"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                />

                {/* Left Supportive Arm & Palm */}
                <motion.g style={{ y: armMovement }}>
                    {/* Elegant Curved Arm */}
                    <motion.path
                        d="M110 180 C 60 220 60 300 160 340"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        className="text-primary/10"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 2, delay: 0.2 }}
                    />
                    {/* Cupped Upward Palm */}
                    <motion.g transform="translate(160, 340) rotate(-10)">
                        <circle r="40" fill="url(#hand-glow)" className="animate-pulse" />
                        <motion.path
                            d="M-25,-10 C -25,20 25,20 25,-10 L 15,10 Q 0,15 -15,10 Z"
                            fill="currentColor"
                            className="text-primary/15"
                            animate={{ rotate: [-2, 2, -2] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                        />
                        {/* Elegant fingers/points of force */}
                        <circle cx="-15" cy="-5" r="2" fill="currentColor" className="text-primary/40" />
                        <circle cx="0" cy="-8" r="2" fill="currentColor" className="text-primary/40" />
                        <circle cx="15" cy="-5" r="2" fill="currentColor" className="text-primary/40" />
                    </motion.g>
                </motion.g>

                {/* Right Supportive Arm & Palm */}
                <motion.g style={{ y: armMovement }}>
                    {/* Elegant Curved Arm */}
                    <motion.path
                        d="M290 180 C 340 220 340 300 240 340"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        className="text-primary/10"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 2, delay: 0.2 }}
                    />
                    {/* Cupped Upward Palm */}
                    <motion.g transform="translate(240, 340) rotate(10)">
                        <circle r="40" fill="url(#hand-glow)" className="animate-pulse" />
                        <motion.path
                            d="M-25,-10 C -25,20 25,20 25,-10 L 15,10 Q 0,15 -15,10 Z"
                            fill="currentColor"
                            className="text-primary/15"
                            animate={{ rotate: [2, -2, 2] }}
                            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                        />
                        {/* Elegant fingers/points of force */}
                        <circle cx="-15" cy="-5" r="2" fill="currentColor" className="text-primary/40" />
                        <circle cx="0" cy="-8" r="2" fill="currentColor" className="text-primary/40" />
                        <circle cx="15" cy="-5" r="2" fill="currentColor" className="text-primary/40" />
                    </motion.g>
                </motion.g>

                {/* Main Body */}
                <motion.rect
                    x="125"
                    y="110"
                    width="150"
                    height="120"
                    rx="45"
                    fill="url(#metal-grad-v2)"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-primary/20"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                />

                {/* Face screen detail */}
                <rect x="140" y="130" width="120" height="80" rx="35" stroke="currentColor" strokeWidth="0.5" className="text-primary/10" />

                {/* Left Eye */}
                <g className="text-primary">
                    <motion.g style={{ x: eyeX, y: eyeY }}>
                        {!isBlinking ? (
                            <motion.rect x="165" y="160" width="8" height="20" rx="4" fill="currentColor" className="opacity-80" />
                        ) : (
                            <motion.rect x="160" y="168" width="18" height="3" rx="1.5" fill="currentColor" />
                        )}
                    </motion.g>
                </g>

                {/* Right Eye */}
                <g className="text-primary">
                    <motion.g style={{ x: eyeX, y: eyeY }}>
                        {!isBlinking ? (
                            <motion.rect x="225" y="160" width="8" height="20" rx="4" fill="currentColor" className="opacity-80" />
                        ) : (
                            <motion.rect x="220" y="168" width="18" height="3" rx="1.5" fill="currentColor" />
                        )}
                    </motion.g>
                </g>

                {/* Breathing Orbs / Particles */}
                <motion.circle cx="150" cy="360" r="2" fill="currentColor" className="text-primary/30" animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ repeat: Infinity, duration: 3 }} />
                <motion.circle cx="200" cy="370" r="3" fill="currentColor" className="text-primary/40" animate={{ opacity: [0.3, 0.9, 0.3] }} transition={{ repeat: Infinity, duration: 4, delay: 1 }} />
                <motion.circle cx="250" cy="360" r="2" fill="currentColor" className="text-primary/30" animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ repeat: Infinity, duration: 3, delay: 2 }} />
            </svg>
        </div>
    )
}
