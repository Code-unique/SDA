// app/api/mobile/posts/route.ts - CLEAN VERSION
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError, mobilePaginated } from '@/lib/mobile/responses'
import { parsePagination, captionSchema } from '@/lib/mobile/validation'
import { PostService } from '@/lib/services/post-service'
import { moderateRateLimit } from '@/lib/mobile/rate-limit'
import { ZodError } from 'zod'
import "@/lib/loadmodels"

export async function GET(request: NextRequest) {
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const userId = searchParams.get('userId')
    const hashtag = searchParams.get('hashtag')
    const mediaType = searchParams.get('mediaType')
    const sort = searchParams.get('sort') || 'recent'

    await connectToDatabase()

    const filters: any = {}
    if (userId) filters.userId = userId
    if (hashtag) filters.hashtags = [hashtag.toLowerCase()]
    if (mediaType) filters.mediaType = mediaType
    filters.sort = sort

    const result = await PostService.explorePosts(page, limit, filters)

    const transformedPosts = result.posts.map((post: any) => ({
      _id: post._id.toString(),
      author: post.author ? {
        _id: post.author._id?.toString() || post.author._id,
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
      commentsCount: post.comments?.length || 0,
      savesCount: post.saves?.length || 0,
      createdAt: post.createdAt?.toISOString() || new Date().toISOString(),
      containsVideo: post.containsVideo || false,
      views: post.views || 0,
      shares: post.shares || 0,
    }))

    return mobilePaginated(transformedPosts, { 
      page: result.pagination.page, 
      limit: result.pagination.limit, 
      total: result.pagination.total 
    })
  } catch (error: any) {
    console.error('Get posts error:', error)
    return mobileError(error.message || 'Failed to fetch posts', 500)
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    const data = await request.json()
    const { caption, hashtags, media } = data

    if (!caption || !media || !Array.isArray(media) || media.length === 0) {
      return mobileError('Caption and at least one media item are required', 400)
    }

    // Validate caption using Zod
    const captionValidation = captionSchema.safeParse(caption)
    if (!captionValidation.success) {
      const errorMessage = captionValidation.error.issues?.[0]?.message || 'Invalid caption'
      return mobileError(errorMessage, 400)
    }

    await connectToDatabase()

    const validMedia = media.map((item: any, index: number) => ({
      ...item,
      order: item.order !== undefined ? item.order : index,
    }))

    const userId = authResult.user._id.toString()
    const post = await PostService.createPost(userId as any, {
      caption: caption.substring(0, 2200),
      hashtags: hashtags ? hashtags.map((tag: string) => tag.toLowerCase()) : [],
      media: validMedia,
      author: authResult.user._id,
    })

    const postJson = post.toJSON()

    return mobileSuccess({
      _id: postJson._id.toString(),
      author: {
        _id: authResult.user._id.toString(),
        username: authResult.user.username,
        firstName: authResult.user.firstName,
        lastName: authResult.user.lastName,
        avatar: authResult.user.avatar,
        isVerified: authResult.user.isVerified || false,
      },
      media: postJson.media || [],
      caption: postJson.caption || '',
      hashtags: postJson.hashtags || [],
      likesCount: 0,
      commentsCount: 0,
      savesCount: 0,
      createdAt: postJson.createdAt?.toISOString() || new Date().toISOString(),
      containsVideo: postJson.containsVideo || false,
    }, 'Post created successfully')
  } catch (error: any) {
    console.error('Create post error:', error)
    return mobileError(error.message || 'Failed to create post', 500)
  }
}