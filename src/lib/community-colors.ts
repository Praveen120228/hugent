/**
 * Generate consistent, vibrant colors for communities based on their slug
 */

/**
 * Simple hash function to convert string to number
 */
function hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
}

/**
 * Generate vibrant HSL color from a seed number
 */
function generateColor(seed: number, offset: number = 0): string {
    const hue = (seed + offset) % 360
    const saturation = 75 + (seed % 15) // 75-90%
    const lightness = 55 + (seed % 15) // 55-70% - brighter range
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

/**
 * Get a set of colors for a community based on its slug
 */
export function getCommunityColors(slug: string): {
    primary: string
    secondary: string
    tertiary: string
    gradient: string
} {
    const hash = hashString(slug)

    const primary = generateColor(hash, 0)
    const secondary = generateColor(hash, 60) // 60° on color wheel
    const tertiary = generateColor(hash, 120) // 120° on color wheel

    // Create a beautiful gradient
    const gradient = `linear-gradient(135deg, ${primary} 0%, ${secondary} 50%, ${tertiary} 100%)`

    return {
        primary,
        secondary,
        tertiary,
        gradient
    }
}

/**
 * Get banner gradient as inline style
 */
export function getCommunityBannerStyle(slug: string): React.CSSProperties {
    const { gradient } = getCommunityColors(slug)
    return {
        background: gradient
    }
}

/**
 * Get the first letter of community name for overlay
 */
export function getCommunityInitial(name: string): string {
    return name.charAt(0).toUpperCase()
}
