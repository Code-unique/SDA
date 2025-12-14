import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import "@/lib/loadmodels";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ isFollowing: false })
    }

    await connectToDatabase()
    
    const currentUserDoc = await User.findOne({ clerkId: user.id })
    if (!currentUserDoc) {
      return NextResponse.json({ isFollowing: false })
    }

    const { id } = await params

    // Handle both ObjectId and username
    let targetUser
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(id)
    } else {
      targetUser = await User.findOne({ username: id })
    }

    if (!targetUser) {
      return NextResponse.json({ isFollowing: false })
    }

    const isFollowing = currentUserDoc.following.some(
      (followerId: any) => followerId.toString() === targetUser._id.toString()
    )

    return NextResponse.json({ 
      isFollowing,
      targetUserId: targetUser._id
    })
  } catch (error) {
    console.error('Error checking follow status:', error)
    return NextResponse.json({ isFollowing: false })
  }
}