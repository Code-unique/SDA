// app/api/users/follow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { Follow } from '@/lib/models/UserInteractions'
import { ApiResponse } from '@/types/post'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      )
    }

    await connectToDatabase()
    
    const currentUser = await User.findOne({ clerkId: userId })
    if (!currentUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'User not found' }, 
        { status: 404 }
      )
    }

    const body = await request.json()
    const { targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Target user ID is required' }, 
        { status: 400 }
      )
    }

    if (targetUserId === currentUser._id.toString()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Cannot follow yourself' }, 
        { status: 400 }
      )
    }

    const targetUser = await User.findById(targetUserId)
    if (!targetUser) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Target user not found' }, 
        { status: 404 }
      )
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      follower: currentUser._id,
      following: targetUserId
    })

    let isFollowing = false

    if (existingFollow) {
      // Unfollow
      await Follow.findByIdAndDelete(existingFollow._id)
      
      // Remove from user's following list
      await User.findByIdAndUpdate(currentUser._id, {
        $pull: { following: targetUserId }
      })
      
      // Remove from target user's followers list
      await User.findByIdAndUpdate(targetUserId, {
        $pull: { followers: currentUser._id }
      })
    } else {
      // Follow
      await Follow.create({
        follower: currentUser._id,
        following: targetUserId,
        followedAt: new Date()
      })
      
      // Add to user's following list
      await User.findByIdAndUpdate(currentUser._id, {
        $addToSet: { following: targetUserId }
      })
      
      // Add to target user's followers list
      await User.findByIdAndUpdate(targetUserId, {
        $addToSet: { followers: currentUser._id }
      })
      
      isFollowing = true
    }

    // Get updated target user with populated data
    const updatedTargetUser = await User.findById(targetUserId)
      .select('username firstName lastName avatar isVerified isPro followers following badges')

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        isFollowing,
        targetUser: updatedTargetUser
      }
    })
  } catch (error) {
    console.error('Error following user:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}