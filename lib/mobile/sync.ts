// lib/mobile/sync.ts - WITH DEBUGGING
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { clerkClient } from '@clerk/nextjs/server'

export async function syncUserFromClerk(clerkId: string) {
  console.log('🔄 Syncing user from Clerk:', clerkId)
  
  await connectToDatabase()
  
  // Check if user already exists
  let dbUser = await User.findOne({ clerkId })

  if (!dbUser) {
    console.log('👤 User not found in DB, creating...')
    
    try {
      // Get user from Clerk
      const clerkUser = await (await clerkClient()).users.getUser(clerkId)
      console.log('📥 Clerk user data:', {
        id: clerkUser.id,
        username: clerkUser.username,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName
      })

      // Create user in MongoDB
      dbUser = await User.create({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses?.[0]?.emailAddress || '',
        username: clerkUser.username || `user_${clerkUser.id.slice(0, 8)}`,
        firstName: clerkUser.firstName || 'User',
        lastName: clerkUser.lastName || 'Name',
        avatar: clerkUser.imageUrl || '',
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
      
      console.log('✅ User created in MongoDB:', dbUser._id)
    } catch (error) {
      console.error('❌ Error creating user:', error)
      throw error
    }
  } else {
    console.log('✅ User already exists in MongoDB:', dbUser._id)
  }

  return dbUser
}