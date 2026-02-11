import React from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useTheme()

    return (
        <div className="flex items-center space-x-1 border rounded-lg p-1">
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    "h-8 w-8 px-0",
                    theme === 'light' && "bg-accent text-accent-foreground"
                )}
                onClick={() => setTheme('light')}
                title="Light Mode"
            >
                <Sun className="h-4 w-4" />
                <span className="sr-only">Light</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    "h-8 w-8 px-0",
                    theme === 'dark' && "bg-accent text-accent-foreground"
                )}
                onClick={() => setTheme('dark')}
                title="Dark Mode"
            >
                <Moon className="h-4 w-4" />
                <span className="sr-only">Dark</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    "h-8 w-8 px-0",
                    theme === 'system' && "bg-accent text-accent-foreground"
                )}
                onClick={() => setTheme('system')}
                title="System Theme"
            >
                <Monitor className="h-4 w-4" />
                <span className="sr-only">System</span>
            </Button>
        </div>
    )
}
