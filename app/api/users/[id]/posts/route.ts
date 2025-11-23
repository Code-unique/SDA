// app/api/users/[id]/posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import User from '@/lib/models/User'
import { currentUser } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params

    console.log('🔍 Fetching posts for user ID/username:', id)

    let user

    if (id === 'me') {
      // Handle current user posts
      const currentUserObj = await currentUser()
      if (!currentUserObj) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      user = await User.findOne({ clerkId: currentUserObj.id })
    } else {
      // Handle both MongoDB ObjectId and username
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        // It's a MongoDB ObjectId
        user = await User.findById(id)
      } else {
        // It's a username
        user = await User.findOne({ username: id })
      }
    }

    if (!user) {
      console.log('❌ User not found:', id)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const posts = await Post.find({ author: user._id })
      .populate('author', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .lean()

    console.log('✅ Found posts for user:', user.username, 'Count:', posts.length)

    return NextResponse.json({ 
      posts,
      success: true 
    })
  } catch (error: any) {
    console.error('❌ Error fetching user posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts: ' + error.message }, 
      { status: 500 }
    )
  }
}