// app/api/mobile/posts/[id]/save/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { SavedItem } from '@/lib/models/UserInteractions'
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

    const existingSave = await SavedItem.findOne({
      user: auth.user._id,
      itemType: 'post',
      itemId: id
    })

    if (existingSave) {
      await SavedItem.findByIdAndDelete(existingSave._id)
      await Post.findByIdAndUpdate(id, { $pull: { saves: auth.user._id } })
      
      return mobileResponse({
        saved: false,
        saveCount: Math.max(0, ((post.saves?.length || 1) - 1))
      })
    } else {
      await SavedItem.create({
        user: auth.user._id,
        itemType: 'post',
        itemId: id,
        savedAt: new Date()
      })
      await Post.findByIdAndUpdate(id, { $addToSet: { saves: auth.user._id } })

      return mobileResponse({
        saved: true,
        saveCount: (post.saves?.length || 0) + 1
      })
    }
  } catch (error: any) {
    console.error('Mobile save error:', error)
    return mobileError(error.message || 'Failed to toggle save', 500)
  }
}