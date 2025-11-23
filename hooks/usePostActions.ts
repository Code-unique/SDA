import { useCallback } from 'react'
import { useUser } from '@clerk/nextjs'

export const usePostActions = () => {
  const { user: currentUser, isSignedIn } = useUser()

  const handleApiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('API call failed:', error)
      throw error
    }
  }, [])

  return {
    currentUser,
    isSignedIn,
    currentUserId: currentUser?.id || '',
    handleApiCall,
  }
}