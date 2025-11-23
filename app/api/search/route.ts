import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import Course from '@/lib/models/Course'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query) {
      return NextResponse.json({ results: [] })
    }

    const searchRegex = new RegExp(query, 'i')
    let results = []

    if (type === 'all' || type === 'users') {
      const users = await User.find({
        $or: [
          { username: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { bio: searchRegex }
        ]
      })
      .select('username firstName lastName avatar bio role')
      .limit(limit)
      .lean()

      results.push(...users.map(user => ({
        type: 'user',
        data: user,
        score: 1
      })))
    }

    if (type === 'all' || type === 'posts') {
      const posts = await Post.find({
        $or: [
          { caption: searchRegex },
          { hashtags: searchRegex }
        ],
        isPublic: true
      })
      .populate('author', 'username firstName lastName avatar')
      .limit(limit)
      .lean()

      results.push(...posts.map(post => ({
        type: 'post',
        data: post,
        score: 1
      })))
    }

    if (type === 'all' || type === 'courses') {
      const courses = await Course.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex }
        ],
        isPublished: true
      })
      .populate('instructor', 'username firstName lastName avatar')
      .limit(limit)
      .lean()

      results.push(...courses.map(course => ({
        type: 'course',
        data: course,
        score: 1
      })))
    }

    // Sort by relevance score (simplified)
    results.sort((a, b) => b.score - a.score)

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}