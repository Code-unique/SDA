// app/api/posts/[id]/like-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import "@/lib/loadmodels";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ liked: false })
    }

    await connectToDatabase()
    
    const dbUser = await User.findOne({ clerkId: user.id })
    if (!dbUser) {
      return NextResponse.json({ liked: false })
    }

    const { id } = await params

    // Get post with like status
    const post = await Post.findById(id)
    
    if (!post) {
      return NextResponse.json({ liked: false })
    }

    const liked = post.likes.some(
      (likeId: any) => likeId.toString() === dbUser._id.toString()
    )

    return NextResponse.json({ 
      liked,
      likeCount: post.likes.length
    })
  } catch (error) {
    console.error('Error checking like status:', error)
    return NextResponse.json({ liked: false })
  }
}