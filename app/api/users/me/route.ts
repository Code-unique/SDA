// app/api/users/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { currentUser } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  try {
    const currentUserObj = await currentUser()
    if (!currentUserObj) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()

    console.log('🔍 Fetching current user with Clerk ID:', currentUserObj.id)

    let user = await User.findOne({ clerkId: currentUserObj.id })
      .select('username firstName lastName avatar banner bio location website role interests skills isVerified followers following createdAt')
      .populate('followers', 'username firstName lastName avatar')
      .populate('following', 'username firstName lastName avatar')

    if (!user) {
      console.log('❌ Current user not found in database, creating new user...')
      
      // Auto-create user if not found
      user = await User.create({
        clerkId: currentUserObj.id,
        email: currentUserObj.emailAddresses[0]?.emailAddress || '',
        username: currentUserObj.username || `user_${currentUserObj.id.slice(0, 8)}`,
        firstName: currentUserObj.firstName || 'User',
        lastName: currentUserObj.lastName || 'Name',
        avatar: currentUserObj.imageUrl || '',
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
        onboardingCompleted: false
      })

      console.log('✅ New user auto-created:', user.username)
    } else {
      console.log('✅ Current user found:', user.username)
    }

    return NextResponse.json({ 
      user,
      success: true 
    })
  } catch (error: any) {
    console.error('❌ Error fetching current user:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}