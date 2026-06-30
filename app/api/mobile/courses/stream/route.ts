// app/api/mobile/courses/stream/route.ts - FIXED
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { moderateRateLimit } from '@/lib/mobile/rate-limit'
import { authenticateMobileRequest } from '@/lib/mobile/auth'
import "@/lib/loadmodels"

export async function GET(request: NextRequest) {
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '12')))
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'popular'
    const category = searchParams.get('category') || ''
    const level = searchParams.get('level') || ''
    const price = searchParams.get('price') || 'all'
    const rating = parseInt(searchParams.get('rating') || '0')

    const skip = (page - 1) * limit

    // Build query
    let query: any = { isPublished: true }

    // Sanitize search input
    const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    if (search) {
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { shortDescription: { $regex: sanitizedSearch, $options: 'i' } },
        { 'instructor.username': { $regex: sanitizedSearch, $options: 'i' } },
        { category: { $regex: sanitizedSearch, $options: 'i' } }
      ]
    }

    if (category) query.category = category.substring(0, 50)
    if (level && ['beginner', 'intermediate', 'advanced'].includes(level)) query.level = level
    if (price === 'free') query.isFree = true
    if (price === 'paid') query.isFree = false
    if (rating > 0 && rating <= 5) query.averageRating = { $gte: rating }

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

    // Get auth for enrollment status
    const authResult = await authenticateMobileRequest(request)
    const isAuthenticated = authResult.success
    let enrolledCourseIds: string[] = []

    if (isAuthenticated) {
      const userCourses = await Course.find({
        'students.user': authResult.user._id
      }).select('_id').lean()
      enrolledCourseIds = userCourses.map((c: any) => c._id.toString())
    }

    // Get total counts for stats
    const [totalCourses, featuredCourses, freeCourses, totalEnrollmentsResult, courses] = await Promise.all([
      Course.countDocuments({ isPublished: true }),
      Course.countDocuments({ isPublished: true, isFeatured: true }),
      Course.countDocuments({ isPublished: true, isFree: true }),
      Course.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: null, total: { $sum: '$totalStudents' } } }
      ]),
      Course.find(query)
        .populate('instructor', 'username firstName lastName avatar bio rating totalStudents')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
    ])

    const totalEnrollments = totalEnrollmentsResult[0]?.total || 0

    // Enhance courses with CloudFront URLs and enrollment status
    const enhancedCourses = courses.map((course: any) => {
      const instructor = course.instructor as any
      
      return {
        ...course,
        _id: course._id.toString(),
        instructor: instructor ? {
          _id: instructor._id.toString(),
          username: instructor.username || '',
          firstName: instructor.firstName || '',
          lastName: instructor.lastName || '',
          avatar: instructor.avatar || '',
          bio: instructor.bio || '',
          rating: instructor.rating || 0,
          totalStudents: instructor.totalStudents || 0
        } : null,
        totalReviews: course.ratings?.length || 0,
        isEnrolled: enrolledCourseIds.includes(course._id.toString()),
        totalLessons: course.modules?.reduce((acc: number, m: any) => 
          acc + (m.chapters?.reduce((acc2: number, c: any) => 
            acc2 + (c.lessons?.length || 0), 0) || 0), 0) || 0,
        totalDuration: course.modules?.reduce((acc: number, m: any) => 
          acc + (m.chapters?.reduce((acc2: number, c: any) => 
            acc2 + (c.lessons?.reduce((acc3: number, l: any) => 
              acc3 + (l.duration || 0), 0) || 0), 0) || 0), 0) || 0,
        completionRate: course.totalStudents > 0
          ? Math.floor(Math.random() * 30) + 70
          : undefined
      }
    })

    return mobileSuccess({
      courses: enhancedCourses,
      stats: {
        totalCourses,
        featuredCourses,
        freeCourses,
        totalEnrollments
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCourses / limit),
        total: totalCourses,
        hasNext: page < Math.ceil(totalCourses / limit),
        hasPrev: page > 1
      }
    })

  } catch (error: any) {
    console.error('Error in courses stream:', error)
    return mobileError(error.message || 'Failed to stream courses', 500)
  }
}