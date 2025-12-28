// hooks/useDeviceDetection.ts
import { useState, useEffect } from 'react'

export function useDeviceDetection() {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouch: false
  })

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isTouch
      })
    }

    // Check initially
    checkDevice()
    
    // Listen for resize
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return deviceInfo
}