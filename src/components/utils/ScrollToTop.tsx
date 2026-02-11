import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

export const ScrollToTop = () => {
    const { pathname } = useLocation()
    const navType = useNavigationType()

    useEffect(() => {
        // Only scroll to top on PUSH (new navigation) or REPLACE
        // POP (back/forward) should rely on browser scroll restoration
        if (navType !== 'POP') {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'instant'
            })
        }
    }, [pathname, navType])

    return null
}
