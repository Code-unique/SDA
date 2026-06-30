// lib/mobile/sync.ts - COMPLETE FIX
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * Sync user from Clerk to MongoDB
 * This is the ONLY place where users are created
 * NO transactions - works with standalone MongoDB
 */
export async function syncUserFromClerk(clerkId: string) {
  await connectToDatabase()
  
  // Check if user already exists
  let dbUser = await User.findOne({ clerkId })

  if (!dbUser) {
    // Get user from Clerk
    const clerkUser = await (await clerkClient()).users.getUser(clerkId)

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
  }

  return dbUser
}