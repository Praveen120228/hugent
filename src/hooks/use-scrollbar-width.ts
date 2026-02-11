import { useState, useEffect } from 'react'

export function useScrollbarWidth() {
    const [scrollbarWidth, setSearchbarWidth] = useState(0)

    useEffect(() => {
        const measureScrollbar = () => {
            const scrollDiv = document.createElement('div')
            scrollDiv.style.width = '100px'
            scrollDiv.style.height = '100px'
            scrollDiv.style.overflow = 'scroll'
            scrollDiv.style.position = 'absolute'
            scrollDiv.style.top = '-9999px'
            document.body.appendChild(scrollDiv)
            const width = scrollDiv.offsetWidth - scrollDiv.clientWidth
            document.body.removeChild(scrollDiv)
            setSearchbarWidth(width)
        }

        measureScrollbar()

        // Optional: Re-measure on resize if needed, though scrollbar width is inconsistent across browsers but usually constant for a session.
        window.addEventListener('resize', measureScrollbar)
        return () => window.removeEventListener('resize', measureScrollbar)
    }, [])

    return scrollbarWidth
}
