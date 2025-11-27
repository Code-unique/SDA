// lib/utils/role-check.ts
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'

export async function isUserAdmin() {
  try {
    const authObj = await auth()
    
    if (!authObj.userId) {
      return false
    }

    await connectToDatabase()
    
    const user = await User.findOne({ clerkId: authObj.userId })
    
    if (!user) {
      return false
    }

    return user.role === 'admin'
  } catch (error) {
    console.error('Error checking user role:', error)
    return false
  }
}

export async function getCurrentUser() {
  try {
    const authObj = await auth()
    
    if (!authObj.userId) {
      return null
    }

    await connectToDatabase()
    
    const user = await User.findOne({ clerkId: authObj.userId })
    
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}