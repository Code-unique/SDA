// app/api/mobile/posts/[id]/share/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId } from '@/lib/mobile/validation'
import "@/lib/loadmodels"

/**
 * POST /api/mobile/posts/:id/share
 * Share a post (increment share count)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    await Post.findByIdAndUpdate(id, { $inc: { shares: 1 } })

    return mobileSuccess({
      shared: true,
      postId: id,
      sharesCount: (post.shares || 0) + 1
    })
  } catch (error: any) {
    console.error('Share error:', error)
    return mobileError(error.message || 'Failed to record share', 500)
  }
}