import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const posts = await Post.find({ isPublic: true })
  .populate({
    path: 'author',
    select: 'firstName lastName username avatar',
    strictPopulate: false    // prevents crashes
  })
  .sort({ createdAt: -1 })
  .limit(50)


    return NextResponse.json({ posts })
  } catch (error: any) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}