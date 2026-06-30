// app/api/mobile/posts/[id]/like/route.ts - Updated without transaction
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId } from '@/lib/mobile/validation'
import { moderateRateLimit } from '@/lib/mobile/rate-limit'
import "@/lib/loadmodels"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    const { id } = await params

    if (!id || !isValidObjectId(id)) {
      return mobileError('Valid post ID is required', 400)
    }

    await connectToDatabase()

    const post = await Post.findById(id)
    
    if (!post) {
      return mobileError('Post not found', 404)
    }

    const userIdStr = authResult.user._id.toString()
    const isLiked = post.likes?.some((likeId: any) => likeId.toString() === userIdStr)

    if (isLiked) {
      post.likes = post.likes.filter((likeId: any) => likeId.toString() !== userIdStr)
    } else {
      post.likes.push(authResult.user._id)
    }

    await post.save()

    return mobileSuccess({
      liked: !isLiked,
      likesCount: post.likes.length
    })
  } catch (error: any) {
    console.error('Like error:', error)
    return mobileError(error.message || 'Failed to toggle like', 500)
  }
}