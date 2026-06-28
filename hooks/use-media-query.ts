import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    
    // Initialize state
    setMatches(media.matches)
    
    const listener = () => setMatches(media.matches)
    
    // Update state when media query changes
    media.addEventListener('change', listener)
    
    return () => media.removeEventListener('change', listener)
  }, [query]) // Remove 'matches' from dependencies

  return matches
}