// app/api/mobile/sync/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { mobileResponse, mobileError } from '@/lib/mobile-auth'
import "@/lib/loadmodels"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body || !body.clerkId) {
      return mobileError('clerkId is required', 400)
    }
    
    await connectToDatabase()
    
    let user = await User.findOne({ clerkId: body.clerkId })
    
    if (!user) {
      // Create new user
      user = await User.create({
        clerkId: body.clerkId,
        email: body.email || '',
        username: body.username || `user_${body.clerkId.slice(0, 8)}`,
        firstName: body.firstName || 'User',
        lastName: body.lastName || 'Name',
        avatar: body.avatar || '',
        banner: body.banner || '',
        bio: body.bio || '',
        location: body.location || '',
        website: body.website || '',
        role: 'user',
        interests: body.interests || [],
        skills: body.skills || [],
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
    } else {
      // Update existing user with new data
      const updates: any = {}
      if (body.email) updates.email = body.email
      if (body.username) updates.username = body.username
      if (body.firstName) updates.firstName = body.firstName
      if (body.lastName) updates.lastName = body.lastName
      if (body.avatar) updates.avatar = body.avatar
      if (body.banner) updates.banner = body.banner
      
      if (Object.keys(updates).length > 0) {
        user = await User.findByIdAndUpdate(
          user._id,
          { $set: updates },
          { new: true }
        )
      }
    }
    
    if (!user) {
      return mobileError('Failed to sync user', 500)
    }
    
    return mobileResponse({
      ...user.toObject(),
      _id: user._id.toString(),
      followers: user.followers?.map((f: any) => f.toString()) || [],
      following: user.following?.map((f: any) => f.toString()) || []
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return mobileError('Failed to sync user: ' + error.message, 500)
  }
}