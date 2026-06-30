// app/api/mobile/posts/[id]/comments/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError, mobilePaginated, serializeComment } from '@/lib/mobile/responses'
import { isValidObjectId, commentSchema, parsePagination } from '@/lib/mobile/validation'
import { ZodError } from 'zod'
import mongoose from 'mongoose'
import "@/lib/loadmodels"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)

    if (!id || !isValidObjectId(id)) {
      return mobileError('Valid post ID is required', 400)
    }

    await connectToDatabase()

    const post = await Post.findById(id)
      .select('comments')
      .populate('comments.user', 'username firstName lastName avatar isVerified isPro')
      .lean()

    if (!post) {
      return mobileError('Post not found', 404)
    }

    const authResult = await requireUser(request)
    const currentUserId = authResult.success ? authResult.user._id.toString() : undefined

    const allComments = post.comments || []
    const topLevelComments = allComments.filter((c: any) => !c.parentComment)

    const paginatedComments = topLevelComments
      .slice((page - 1) * limit, page * limit)
      .map((c: any) => {
        const replies = allComments
          .filter((r: any) => r.parentComment && r.parentComment.toString() === c._id.toString())
          .map((r: any) => serializeComment(r, currentUserId))
          .slice(0, 3)

        return {
          ...serializeComment(c, currentUserId),
          replies,
        }
      })

    return mobilePaginated(paginatedComments, {
      page,
      limit,
      total: topLevelComments.length
    })
  } catch (error: any) {
    console.error('Get comments error:', error)
    return mobileError(error.message || 'Failed to fetch comments', 500)
  }
}

// app/api/mobile/posts/[id]/comments/route.ts - Updated without transaction
// Replace the POST handler with this version:

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const body = await request.json()
    const { text } = body

    const commentValidation = commentSchema.safeParse(text)
    if (!commentValidation.success) {
      const errorMessage = commentValidation.error.issues?.[0]?.message || 'Invalid comment'
      return mobileError(errorMessage, 400)
    }

    const post = await Post.findById(id)
    if (!post) {
      return mobileError('Post not found', 404)
    }

    const comment = {
      _id: new mongoose.Types.ObjectId(),
      user: authResult.user._id,
      text: text.substring(0, 1000),
      likes: [],
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false
    }

    post.comments.push(comment)
    await post.save()

    await post.populate('comments.user', 'username firstName lastName avatar isVerified isPro')

    const newComment = post.comments.find((c: any) => c._id.toString() === comment._id.toString())

    return mobileSuccess({
      ...serializeComment(newComment, authResult.user._id.toString()),
    }, 'Comment added successfully')
  } catch (error: any) {
    console.error('Add comment error:', error)
    return mobileError(error.message || 'Failed to add comment', 500)
  }
}