// app/api/_lib/auth-utils.ts
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'

export async function authenticateAdmin() {
  try {
    const user = await currentUser()
    
    if (!user) {
      return { success: false, error: 'Unauthorized', status: 401 }
    }

    await connectToDatabase()
    const dbUser = await User.findOne({ clerkId: user.id })
    
    if (!dbUser) {
      return { success: false, error: 'User not found in system', status: 403 }
    }
    
    if (dbUser.role !== 'admin') {
      return { success: false, error: 'Admin access required', status: 403 }
    }

    return { 
      success: true, 
      user: dbUser,
      clerkUser: user
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return { 
      success: false, 
      error: 'Authentication service error', 
      status: 500 
    }
  }
}