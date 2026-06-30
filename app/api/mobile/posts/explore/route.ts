// app/api/mobile/posts/explore/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { mobileSuccess, mobileError, mobilePaginated } from '@/lib/mobile/responses'
import { parsePagination } from '@/lib/mobile/validation'
import "@/lib/loadmodels"

/**
 * GET /api/mobile/posts/explore
 * Explore posts with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const type = searchParams.get('type') || 'all'
    const sort = searchParams.get('sort') || 'trending'
    const hashtag = searchParams.get('hashtag')
    const search = searchParams.get('search')

    await connectToDatabase()

    const filters: any = { isPublic: true }

    if (type === 'images') filters.containsVideo = false
    else if (type === 'videos') filters.containsVideo = true

    if (hashtag) {
      filters.hashtags = { $in: [hashtag.toLowerCase()] }
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      filters.$or = [
        { caption: { $regex: searchRegex } },
        { hashtags: { $in: [search.toLowerCase()] } }
      ]
    }

    let sortOptions: any = { createdAt: -1 }
    if (sort === 'popular') {
      sortOptions = { likesCount: -1, createdAt: -1 }
    } else if (sort === 'trending') {
      sortOptions = { engagement: -1, createdAt: -1 }
    }

    const [posts, total] = await Promise.all([
      Post.find(filters)
        .populate('author', 'username firstName lastName avatar isVerified isPro')
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(filters)
    ])

    const transformedPosts = posts.map((post: any) => ({
      _id: post._id.toString(),
      author: post.author ? {
        _id: post.author._id?.toString() || '',
        username: post.author.username || '',
        firstName: post.author.firstName || '',
        lastName: post.author.lastName || '',
        avatar: post.author.avatar || '',
        isVerified: post.author.isVerified || false,
        isPro: post.author.isPro || false,
      } : null,
      media: post.media || [],
      caption: post.caption || '',
      hashtags: post.hashtags || [],
      likesCount: post.likes?.length || 0,
      savesCount: post.saves?.length || 0,
      commentsCount: post.comments?.length || 0,
      createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
      containsVideo: post.containsVideo || false,
      views: post.views || 0,
      shares: post.shares || 0,
      engagement: post.engagement || 0,
    }))

    return mobilePaginated(transformedPosts, { page, limit, total })
  } catch (error: any) {
    console.error('Explore error:', error)
    return mobileError(error.message || 'Failed to fetch explore posts', 500)
  }
}