// app/api/mobile/sync/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import { currentUser } from '@clerk/nextjs/server'
import "@/lib/loadmodels"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clerkId, email, username, firstName, lastName, avatar } = body
    
    console.log('📝 Sync user request:', { clerkId, email, username })
    
    if (!clerkId) {
      return mobileError('clerkId is required', 400)
    }
    
    await connectToDatabase()
    
    // Try to find existing user
    let user = await User.findOne({ clerkId })
    
    if (user) {
      console.log('✅ User already exists:', user.username)
      return mobileResponse({
        ...user.toObject(),
        _id: user._id.toString()
      })
    }
    
    // Create new user
    user = await User.create({
      clerkId,
      email: email || '',
      username: username || `user_${clerkId.slice(0, 8)}`,
      firstName: firstName || 'User',
      lastName: lastName || 'Name',
      avatar: avatar || '',
      banner: '',
      bio: '',
      location: '',
      website: '',
      role: 'user',
      interests: [],
      skills: [],
      isVerified: false,
      followers: [],
      following: [],
      onboardingCompleted: false,
      notificationPreferences: {
        likes: true,
        comments: true,
        follows: true,
        courses: true,
        achievements: true,
        messages: true,
        announcements: true,
        marketing: false,
      },
      lastNotificationReadAt: new Date(),
    })
    
    console.log('✅ New user created:', user.username)
    
    return mobileResponse({
      ...user.toObject(),
      _id: user._id.toString()
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return mobileError(error.message || 'Failed to sync user', 500)
  }
}