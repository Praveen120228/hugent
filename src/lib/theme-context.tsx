import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem('theme') as Theme
        return storedTheme || 'system'
    })

    const setTheme = (newTheme: Theme) => {
        localStorage.setItem('theme', newTheme)
        setThemeState(newTheme)
    }

    useEffect(() => {
        const root = window.document.documentElement

        const applyTheme = () => {
            root.classList.remove('light', 'dark')
            if (theme === 'system') {
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light'
                root.classList.add(systemTheme)
            } else {
                root.classList.add(theme)
            }
        }

        applyTheme()

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const listener = (e: MediaQueryListEvent) => {
                root.classList.remove('light', 'dark')
                root.classList.add(e.matches ? 'dark' : 'light')
            }

            mediaQuery.addEventListener('change', listener)
            return () => mediaQuery.removeEventListener('change', listener)
        }
    }, [theme])

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
