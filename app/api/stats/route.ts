import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import Course from '@/lib/models/Course'

export async function GET() {
  try {
    await connectToDatabase()

    const [
      totalUsers,
      totalCourses,
      totalPosts,
      recentUsers
    ] = await Promise.all([
      User.countDocuments({}),
      Course.countDocuments({}),
      Post.countDocuments({ isPublic: true }),
      User.find({}).sort({ createdAt: -1 }).limit(5)
    ])

    // Calculate growth metrics (you can enhance this with actual analytics)
    const userGrowth = Math.min(100, Math.floor((totalUsers / 1000) * 100))
    const postGrowth = Math.min(100, Math.floor((totalPosts / 5000) * 100))

    return NextResponse.json({
      totalUsers,
      totalCourses,
      totalPosts,
      satisfactionRate: 98, // You can calculate this based on reviews/ratings
      userGrowth,
      postGrowth,
      activeUsers: Math.floor(totalUsers * 0.3), // 30% active users
      recentUsers: recentUsers.map(user => ({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        username: user.username
      }))
    })
  } catch (error: any) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}