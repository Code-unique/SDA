import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import YouTubeCourse from '@/lib/models/YouTubeCourse'
import '@/lib/loadmodels'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category')
    const level = searchParams.get('level')
    const price = searchParams.get('price')
    const sort = searchParams.get('sort') || 'popular'
    const enrollment = searchParams.get('enrollment')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    const skip = (page - 1) * limit

    let query: any = { isPublished: true }

    // Search query
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ]
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category
    }

    // Level filter
    if (level && level !== 'all') {
      query.level = level
    }

    // Price filter
    if (price === 'free') {
      query.isFree = true
    } else if (price === 'paid') {
      query.isFree = false
    }

    // Enrollment filter
    if (enrollment === 'auto') {
      query.manualEnrollmentEnabled = false
    } else if (enrollment === 'manual') {
      query.manualEnrollmentEnabled = true
    }

    // Build sort options
    let sortOptions: any = {}
    switch (sort) {
      case 'popular':
        sortOptions.totalStudents = -1
        break
      case 'newest':
        sortOptions.createdAt = -1
        break
      case 'rating':
        sortOptions.averageRating = -1
        break
      case 'price-low':
        sortOptions.price = 1
        break
      case 'price-high':
        sortOptions.price = -1
        break
      default:
        sortOptions.createdAt = -1
    }

    // Get total count for pagination
    const total = await YouTubeCourse.countDocuments(query)

    // Get courses
    const courses = await YouTubeCourse.find(query)
      .populate('instructor', 'username firstName lastName avatar')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean()

    // Calculate total duration and lessons for each course
    const enhancedCourses = courses.map((course: any) => {
      let totalDuration = 0
      let totalLessons = 0
      
      if (course.modules) {
        course.modules.forEach((module: any) => {
          if (module.chapters) {
            module.chapters.forEach((chapter: any) => {
              if (chapter.lessons) {
                totalLessons += chapter.lessons.length
                chapter.lessons.forEach((lesson: any) => {
                  totalDuration += lesson.duration || 0
                  if (lesson.subLessons) {
                    totalLessons += lesson.subLessons.length
                    lesson.subLessons.forEach((subLesson: any) => {
                      totalDuration += subLesson.duration || 0
                    })
                  }
                })
              }
            })
          }
        })
      }

      return {
        ...course,
        _id: course._id.toString(),
        totalDuration,
        totalLessons,
        totalReviews: course.ratings?.length || 0
      }
    })

    return NextResponse.json({
      courses: enhancedCourses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    })
    
  } catch (error: any) {
    console.error('Error listing YouTube courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}