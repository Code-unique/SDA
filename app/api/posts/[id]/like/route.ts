// app/api/mobile/posts/[id]/like/route.ts - WITH IDEMPOTENCY
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId } from '@/lib/mobile/validation'
import { moderateRateLimit } from '@/lib/mobile/rate-limit'
import { checkIdempotency, storeIdempotentResponse } from '@/lib/mobile/idempotency'
import "@/lib/loadmodels"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  // Check idempotency
  const { isIdempotent, cachedResponse } = checkIdempotency(request)
  if (isIdempotent && cachedResponse) {
    return mobileSuccess(cachedResponse.response, undefined, cachedResponse.statusCode)
  }

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

    const session = await Post.startSession()
    session.startTransaction()

    try {
      const post = await Post.findById(id).session(session)
      
      if (!post) {
        await session.abortTransaction()
        return mobileError('Post not found', 404)
      }

      const userIdStr = authResult.user._id.toString()
      const isLiked = post.likes?.some((likeId: any) => likeId.toString() === userIdStr)

      if (isLiked) {
        post.likes = post.likes.filter((likeId: any) => likeId.toString() !== userIdStr)
      } else {
        post.likes.push(authResult.user._id)
      }

      await post.save({ session })
      await session.commitTransaction()

      const response = {
        liked: !isLiked,
        likesCount: post.likes.length
      }

      // Store idempotent response
      storeIdempotentResponse(request, response, 200)

      return mobileSuccess(response)
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  } catch (error: any) {
    console.error('Like error:', error)
    return mobileError(error.message || 'Failed to toggle like', 500)
  }
}