import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit")) || 50

    const posts = await Post.find({ isPublic: true })
      .populate({
        path: "author",
        select: "firstName lastName username avatar",
        strictPopulate: false
      })
      .sort({ createdAt: -1 })
      .limit(limit)

    return NextResponse.json({ posts })
  } catch (error: any) {
    console.error("Error fetching posts:", error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
