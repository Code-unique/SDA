// app/api/mobile/courses/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError, mobilePaginated } from '@/lib/mobile/responses'
import { parsePagination } from '@/lib/mobile/validation'
import { moderateRateLimit } from '@/lib/mobile/rate-limit'
import "@/lib/loadmodels"

export async function GET(request: NextRequest) {
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const level = searchParams.get('level') || ''
    const price = searchParams.get('price') || 'all'

    await connectToDatabase()

    const query: any = { isPublished: true }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ]
    }

    if (category) query.category = category
    if (level && ['beginner', 'intermediate', 'advanced'].includes(level)) {
      query.level = level
    }
    if (price === 'free') query.isFree = true
    else if (price === 'paid') query.isFree = false

    const authResult = await requireUser(request)
    const isAuthenticated = authResult.success
    let enrolledCourseIds: string[] = []

    if (isAuthenticated) {
      const userCourses = await Course.find({
        'students.user': authResult.user._id
      }).select('_id').lean()
      enrolledCourseIds = userCourses.map((c: any) => c._id.toString())
    }

    const [courses, total] = await Promise.all([
      Course.find(query)
        .populate('instructor', 'username firstName lastName avatar bio rating totalStudents')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Course.countDocuments(query)
    ])

    const transformedCourses = courses.map((course: any) => {
      const instructor = course.instructor as any
      return {
        _id: course._id.toString(),
        title: course.title,
        description: course.shortDescription || course.description,
        slug: course.slug,
        thumbnail: course.thumbnail,
        price: course.price,
        isFree: course.isFree,
        level: course.level,
        category: course.category,
        instructor: instructor ? {
          _id: instructor._id.toString(),
          username: instructor.username || '',
          firstName: instructor.firstName || '',
          lastName: instructor.lastName || '',
          avatar: instructor.avatar || '',
          rating: instructor.rating || 0,
          totalStudents: instructor.totalStudents || 0,
        } : null,
        totalStudents: course.totalStudents || 0,
        averageRating: course.averageRating || 0,
        totalReviews: course.ratings?.length || 0,
        totalLessons: course.modules?.reduce((acc: number, m: any) => 
          acc + (m.chapters?.reduce((acc2: number, c: any) => 
            acc2 + (c.lessons?.length || 0), 0) || 0), 0) || 0,
        totalDuration: course.modules?.reduce((acc: number, m: any) => 
          acc + (m.chapters?.reduce((acc2: number, c: any) => 
            acc2 + (c.lessons?.reduce((acc3: number, l: any) => 
              acc3 + (l.duration || 0), 0) || 0), 0) || 0), 0) || 0,
        isEnrolled: enrolledCourseIds.includes(course._id.toString()),
        isFeatured: course.isFeatured || false,
        createdAt: course.createdAt,
      }
    })

    return mobilePaginated(transformedCourses, { page, limit, total })
  } catch (error: any) {
    console.error('Mobile courses error:', error)
    return mobileError(error.message || 'Failed to fetch courses', 500)
  }
}