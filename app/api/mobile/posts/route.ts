// app/api/mobile/posts/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import { PostService } from '@/lib/services/post-service'
import "@/lib/loadmodels"

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateMobileRequest(request)
    if (!auth.success) {
      return mobileError(auth.error || 'Unauthorized', auth.status || 401)
    }

    await connectToDatabase()

    const data = await request.json()
    const { caption, hashtags, media } = data

    if (!caption || !media || !Array.isArray(media) || media.length === 0) {
      return mobileError('Caption and at least one media item are required', 400)
    }

    const validMedia = media.map((item: any, index: number) => {
      if (!item.type || !item.url) {
        throw new Error(`Invalid media item at index ${index}`)
      }
      if (!['image', 'video'].includes(item.type)) {
        throw new Error(`Invalid media type at index ${index}`)
      }
      return {
        ...item,
        order: item.order !== undefined ? item.order : index
      }
    })

    const post = await PostService.createPost(auth.user._id, {
      caption: caption.substring(0, 2200),
      hashtags: hashtags ? hashtags.map((tag: string) => tag.toLowerCase()) : [],
      media: validMedia,
      author: auth.user._id
    })

    const postJson = post.toJSON()
    
    return mobileResponse({
      ...postJson,
      _id: postJson._id.toString(),
      author: {
        ...postJson.author,
        _id: postJson.author._id.toString()
      },
      likesCount: postJson.likes?.length || 0,
      commentsCount: postJson.comments?.length || 0,
      savesCount: postJson.saves?.length || 0
    })
  } catch (error: any) {
    console.error('Mobile create post error:', error)
    return mobileError(error.message || 'Failed to create post', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const userId = searchParams.get('userId')
    const hashtag = searchParams.get('hashtag')
    const mediaType = searchParams.get('mediaType')
    const sort = searchParams.get('sort') || 'recent'

    const filters: any = {}
    if (userId) filters.userId = userId
    if (hashtag) filters.hashtags = [hashtag.toLowerCase()]
    if (mediaType) filters.mediaType = mediaType
    filters.sort = sort

    const result = await PostService.explorePosts(page, limit, filters)

    const transformedPosts = result.posts.map((post: any) => ({
      ...post,
      _id: post._id.toString(),
      author: post.author ? {
        ...post.author,
        _id: post.author._id?.toString() || post.author._id
      } : null,
      likesCount: post.likes?.length || 0,
      savesCount: post.saves?.length || 0,
      commentsCount: post.comments?.length || 0
    }))

    return mobileResponse({
      posts: transformedPosts,
      pagination: result.pagination
    })
  } catch (error: any) {
    console.error('Mobile get posts error:', error)
    return mobileError(error.message || 'Failed to fetch posts', 500)
  }
}