// app/api/courses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'popular'
    const category = searchParams.get('category') || ''
    const level = searchParams.get('level') || ''
    const price = searchParams.get('price') || 'all'
    const rating = parseInt(searchParams.get('rating') || '0')

    const skip = (page - 1) * limit

    // Build query (same as streaming)
    let query: any = { isPublished: true }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { 'instructor.username': { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ]
    }

    if (category) query.category = category
    if (level) query.level = level
    if (price === 'free') query.isFree = true
    if (price === 'paid') query.isFree = false
    if (rating > 0) query.averageRating = { $gte: rating }

    // Sort options
    let sortOptions: any = {}
    switch (sort) {
      case 'newest': sortOptions = { createdAt: -1 }; break
      case 'rating': sortOptions = { averageRating: -1 }; break
      case 'duration': sortOptions = { totalDuration: -1 }; break
      case 'price-low': sortOptions = { price: 1 }; break
      case 'price-high': sortOptions = { price: -1 }; break
      default: sortOptions = { totalStudents: -1 }; break
    }

    const courses = await Course.find(query)
      .populate('instructor', 'username firstName lastName avatar bio rating totalStudents')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean()

    // Add AI features for demo
    const enhancedCourses = courses.map(course => ({
      ...course,
      aiFeatures: {
        hasAIAssistant: Math.random() > 0.7,
        hasPersonalizedLearning: Math.random() > 0.5,
        hasSmartRecommendations: Math.random() > 0.6
      },
      completionRate: course.totalStudents > 0 
        ? Math.floor(Math.random() * 30) + 70
        : undefined
    }))

    // Get stats
    const totalCourses = await Course.countDocuments({ isPublished: true })
    const featuredCourses = await Course.countDocuments({ isPublished: true, isFeatured: true })
    const freeCourses = await Course.countDocuments({ isPublished: true, isFree: true })
    const totalEnrollments = await Course.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: null, total: { $sum: '$totalStudents' } } }
    ])

    return NextResponse.json({
      courses: enhancedCourses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCourses / limit),
        total: totalCourses,
        hasNext: page < Math.ceil(totalCourses / limit),
        hasPrev: page > 1
      },
      stats: {
        totalCourses,
        featuredCourses,
        freeCourses,
        totalEnrollments: totalEnrollments[0]?.total || 0
      }
    })

  } catch (error: any) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}