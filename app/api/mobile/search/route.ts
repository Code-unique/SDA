// app/api/mobile/search/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import Course from '@/lib/models/Course'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { parsePagination } from '@/lib/mobile/validation'
import "@/lib/loadmodels"

/**
 * GET /api/mobile/search
 * Search users, posts, and courses
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all' // all, users, posts, courses
    const { page, limit } = parsePagination(searchParams)

    if (!query || query.length < 2) {
      return mobileSuccess({
        users: [],
        posts: [],
        courses: [],
        total: 0,
      })
    }

    await connectToDatabase()

    const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const searchRegex = new RegExp(sanitizedQuery, 'i')

    const results: any = {}

    // Search Users
    if (type === 'all' || type === 'users') {
      const users = await User.find({
        $or: [
          { username: { $regex: searchRegex } },
          { firstName: { $regex: searchRegex } },
          { lastName: { $regex: searchRegex } },
          { bio: { $regex: searchRegex } }
        ]
      })
        .select('username firstName lastName avatar isVerified followers following')
        .limit(type === 'users' ? limit : 5)
        .lean()

      results.users = users.map((u: any) => ({
        _id: u._id.toString(),
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        avatar: u.avatar,
        isVerified: u.isVerified || false,
        followersCount: u.followers?.length || 0,
        followingCount: u.following?.length || 0,
      }))
    }

    // Search Posts
    if (type === 'all' || type === 'posts') {
      const posts = await Post.find({
        isPublic: true,
        $or: [
          { caption: { $regex: searchRegex } },
          { hashtags: { $in: [sanitizedQuery.toLowerCase()] } }
        ]
      })
        .populate('author', 'username firstName lastName avatar isVerified')
        .sort({ createdAt: -1 })
        .limit(type === 'posts' ? limit : 5)
        .lean()

      results.posts = posts.map((p: any) => ({
        _id: p._id.toString(),
        author: p.author ? {
          _id: p.author._id.toString(),
          username: p.author.username,
          firstName: p.author.firstName,
          lastName: p.author.lastName,
          avatar: p.author.avatar,
          isVerified: p.author.isVerified || false,
        } : null,
        media: p.media || [],
        caption: p.caption || '',
        hashtags: p.hashtags || [],
        likesCount: p.likes?.length || 0,
        commentsCount: p.comments?.length || 0,
        createdAt: p.createdAt?.toISOString() || new Date().toISOString(),
      }))
    }

    // Search Courses
    if (type === 'all' || type === 'courses') {
      const courses = await Course.find({
        isPublished: true,
        $or: [
          { title: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { category: { $regex: searchRegex } },
          { tags: { $in: [sanitizedQuery.toLowerCase()] } }
        ]
      })
        .populate('instructor', 'username firstName lastName avatar')
        .limit(type === 'courses' ? limit : 5)
        .lean()

      results.courses = courses.map((c: any) => ({
        _id: c._id.toString(),
        title: c.title,
        description: c.shortDescription || c.description,
        thumbnail: c.thumbnail,
        slug: c.slug,
        price: c.price,
        isFree: c.isFree,
        instructor: c.instructor ? {
          _id: (c.instructor as any)._id.toString(),
          username: c.instructor.username,
          firstName: c.instructor.firstName,
          lastName: c.instructor.lastName,
          avatar: c.instructor.avatar,
        } : null,
        averageRating: c.averageRating || 0,
        totalStudents: c.totalStudents || 0,
      }))
    }

    return mobileSuccess({
      ...results,
      total: (results.users?.length || 0) + (results.posts?.length || 0) + (results.courses?.length || 0),
    })
  } catch (error: any) {
    console.error('Search error:', error)
    return mobileError(error.message || 'Failed to search', 500)
  }
}