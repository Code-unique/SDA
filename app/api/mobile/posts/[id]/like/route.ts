// app/api/mobile/posts/[id]/like/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import "@/lib/loadmodels"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateMobileRequest(request)
    if (!auth.success) {
      return mobileError(auth.error || 'Unauthorized', auth.status || 401)
    }

    const { id } = await params
    
    if (!id || id.length !== 24) {
      return mobileError('Valid post ID is required', 400)
    }

    await connectToDatabase()

    const post = await Post.findById(id)
    if (!post) {
      return mobileError('Post not found', 404)
    }

    const userIdStr = auth.user._id.toString()
    const isLiked = post.likes.some((likeId: any) => likeId.toString() === userIdStr)

    if (isLiked) {
      post.likes = post.likes.filter((likeId: any) => likeId.toString() !== userIdStr)
    } else {
      post.likes.push(auth.user._id)
    }

    await post.save()

    return mobileResponse({
      liked: !isLiked,
      likesCount: post.likes.length
    })
  } catch (error: any) {
    console.error('Mobile like error:', error)
    return mobileError(error.message || 'Failed to toggle like', 500)
  }
}