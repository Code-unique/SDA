import { clerkClient } from '@clerk/nextjs/server'

export const getClerkUser = async (userId: string) => {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    return user
  } catch (error) {
    console.error('Error fetching Clerk user:', error)
    return null
  }
}