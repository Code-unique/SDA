// app/api/users/[id]/follow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { NotificationService } from '@/lib/services/notificationService'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    const { id } = await params

    const currentAppUser = await User.findOne({ clerkId: user.id })
    
    // Handle both MongoDB ObjectId and username lookups
    let targetUser
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(id)
    } else {
      targetUser = await User.findOne({ username: id })
    }

    if (!currentAppUser || !targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Prevent users from following themselves
    if (currentAppUser._id.toString() === targetUser._id.toString()) {
      return NextResponse.json({ success: false, error: 'Cannot follow yourself' }, { status: 400 })
    }

    const isFollowing = currentAppUser.following.includes(targetUser._id)

    if (isFollowing) {
      // Unfollow logic
      await User.findByIdAndUpdate(currentAppUser._id, {
        $pull: { following: targetUser._id }
      })
      await User.findByIdAndUpdate(targetUser._id, {
        $pull: { followers: currentAppUser._id }
      })
    } else {
      // Follow logic
      await User.findByIdAndUpdate(currentAppUser._id, {
        $addToSet: { following: targetUser._id }
      })
      await User.findByIdAndUpdate(targetUser._id, {
        $addToSet: { followers: currentAppUser._id }
      })

      // Create notification
      await NotificationService.createNotification({
        userId: targetUser._id,
        type: 'follow',
        fromUserId: currentAppUser._id,
        message: `${currentAppUser.firstName} ${currentAppUser.lastName} started following you`,
        actionUrl: `/profile/${currentAppUser.username}`
      })
    }

    // Return updated follow status
    return NextResponse.json({
      success: true,
      data: {
        following: !isFollowing,
        currentUserId: currentAppUser._id,
        targetUserId: targetUser._id
      }
    })

  } catch (error: any) {
    console.error('Error in follow action:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to follow user: ' + error.message }, 
      { status: 500 }
    )
  }
}

// GET endpoint remains the same...

// GET endpoint to check follow status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    const { id } = await params

    const currentAppUser = await User.findOne({ clerkId: user.id })
    
    // Handle both MongoDB ObjectId and username lookups
    let targetUser
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(id)
    } else {
      targetUser = await User.findOne({ username: id })
    }

    if (!currentAppUser || !targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const isFollowing = currentAppUser.following.includes(targetUser._id)

    return NextResponse.json({ 
      success: true,
      data: {
        isFollowing,
        currentUserId: currentAppUser._id,
        targetUserId: targetUser._id
      }
    })

  } catch (error: any) {
    console.error('Error checking follow status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check follow status: ' + error.message }, 
      { status: 500 }
    )
  }
}