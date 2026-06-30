// app/api/mobile/posts/[id]/save/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { SavedItem } from '@/lib/models/UserInteractions'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId } from '@/lib/mobile/validation'
import "@/lib/loadmodels"

/**
 * POST /api/mobile/posts/:id/save
 * Save or unsave a post
 */
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

    const post = await Post.findById(id)
    if (!post) {
      return mobileError('Post not found', 404)
    }

    const existingSave = await SavedItem.findOne({
      user: authResult.user._id,
      itemType: 'post',
      itemId: id
    })

    if (existingSave) {
      await SavedItem.findByIdAndDelete(existingSave._id)
      await Post.findByIdAndUpdate(id, { $pull: { saves: authResult.user._id } })

      return mobileSuccess({
        saved: false,
        saveCount: Math.max(0, (post.saves?.length || 1) - 1)
      })
    } else {
      await SavedItem.create({
        user: authResult.user._id,
        itemType: 'post',
        itemId: id,
        savedAt: new Date()
      })
      await Post.findByIdAndUpdate(id, { $addToSet: { saves: authResult.user._id } })

      return mobileSuccess({
        saved: true,
        saveCount: (post.saves?.length || 0) + 1
      })
    }
  } catch (error: any) {
    console.error('Save error:', error)
    return mobileError(error.message || 'Failed to toggle save', 500)
  }
}