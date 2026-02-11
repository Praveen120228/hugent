/**
 * Extract dominant color from an image URL using Canvas API
 */

interface RGBColor {
    r: number
    g: number
    b: number
}

interface ColorGradient {
    primary: string
    secondary: string
    tertiary: string
    gradient: string
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6
                break
            case g:
                h = ((b - r) / d + 2) / 6
                break
            case b:
                h = ((r - g) / d + 4) / 6
                break
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    }
}

/**
 * Adjust HSL values for better gradient vibrancy
 */
function adjustColorForGradient(h: number, s: number, l: number): string {
    // Boost saturation for vibrancy (minimum 60%)
    const adjustedS = Math.max(s, 60)
    // Adjust lightness to 50-70% range for visibility
    const adjustedL = Math.min(Math.max(l, 50), 70)
    return `hsl(${h}, ${adjustedS}%, ${adjustedL}%)`
}

/**
 * Extract dominant color from image
 */
export async function extractDominantColor(imageUrl: string): Promise<ColorGradient | null> {
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous' // Handle CORS

        img.onload = () => {
            try {
                // Create canvas
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    resolve(null)
                    return
                }

                // Scale down for performance
                const maxSize = 100
                const scale = Math.min(maxSize / img.width, maxSize / img.height)
                canvas.width = img.width * scale
                canvas.height = img.height * scale

                // Draw image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

                // Get pixel data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const pixels = imageData.data

                // Count color frequencies (sample every 10th pixel for performance)
                const colorMap = new Map<string, number>()
                for (let i = 0; i < pixels.length; i += 40) { // RGBA = 4 values, skip 10 pixels
                    const r = pixels[i]
                    const g = pixels[i + 1]
                    const b = pixels[i + 2]
                    const a = pixels[i + 3]

                    // Skip transparent/very light/very dark pixels
                    if (a < 128 || (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) {
                        continue
                    }

                    // Quantize to reduce color variations (group similar colors)
                    const key = `${Math.floor(r / 10)},${Math.floor(g / 10)},${Math.floor(b / 10)}`
                    colorMap.set(key, (colorMap.get(key) || 0) + 1)
                }

                // Find most frequent color
                let maxCount = 0
                let dominantColor: RGBColor = { r: 100, g: 100, b: 200 } // Default

                for (const [key, count] of colorMap.entries()) {
                    if (count > maxCount) {
                        maxCount = count
                        const [r, g, b] = key.split(',').map(n => parseInt(n) * 10)
                        dominantColor = { r, g, b }
                    }
                }

                // Convert to HSL
                const hsl = rgbToHsl(dominantColor.r, dominantColor.g, dominantColor.b)

                // Generate solid color for profile banner
                const solidColor = adjustColorForGradient(hsl.h, hsl.s, hsl.l)

                resolve({
                    primary: solidColor,
                    secondary: solidColor,
                    tertiary: solidColor,
                    gradient: solidColor // Single solid color instead of gradient
                })
            } catch (error) {
                console.error('Error extracting color:', error)
                resolve(null)
            }
        }

        img.onerror = () => {
            console.error('Failed to load image for color extraction')
            resolve(null)
        }

        img.src = imageUrl
    })
}

/**
 * Get user initial for overlay
 */
export function getUserInitial(username?: string, email?: string): string {
    if (username) return username.charAt(0).toUpperCase()
    if (email) return email.charAt(0).toUpperCase()
    return 'U'
}
