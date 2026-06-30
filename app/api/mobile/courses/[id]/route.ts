// app/api/mobile/courses/[id]/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'
import UserProgress from '@/lib/models/UserProgress'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId } from '@/lib/mobile/validation'
import { moderateRateLimit } from '@/lib/mobile/rate-limit'
import "@/lib/loadmodels"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params

    if (!id) {
      return mobileError('Course ID is required', 400)
    }

    await connectToDatabase()

    let course
    if (isValidObjectId(id)) {
      course = await Course.findById(id)
        .populate('instructor', 'username firstName lastName avatar bio rating totalStudents expertise')
        .populate('ratings.user', 'username firstName lastName avatar')
        .lean()
    } else {
      course = await Course.findOne({ slug: id })
        .populate('instructor', 'username firstName lastName avatar bio rating totalStudents expertise')
        .populate('ratings.user', 'username firstName lastName avatar')
        .lean()
    }

    if (!course) {
      return mobileError('Course not found', 404)
    }

    const authResult = await requireUser(request)
    const isAuthenticated = authResult.success

    let isEnrolled = false
    let userProgress = null
    let canAccessContent = false

    if (isAuthenticated) {
      isEnrolled = course.students?.some(
        (s: any) => s.user.toString() === authResult.user._id.toString()
      ) || false

      if (isEnrolled) {
        const progress = await UserProgress.findOne({
          courseId: course._id,
          userId: authResult.user._id
        }).lean()
        
        if (progress) {
          userProgress = progress as any
        }
        canAccessContent = true
      }

      if (course.isFree || course.price === 0) {
        canAccessContent = true
      }
    }

    let totalLessons = 0
    let totalDuration = 0
    let totalSubLessons = 0

    if (course.modules) {
      course.modules.forEach((module: any) => {
        if (module.chapters) {
          module.chapters.forEach((chapter: any) => {
            if (chapter.lessons) {
              totalLessons += chapter.lessons.length
              chapter.lessons.forEach((lesson: any) => {
                totalDuration += lesson.duration || 0
                if (lesson.subLessons) {
                  totalSubLessons += lesson.subLessons.length
                  lesson.subLessons.forEach((sub: any) => {
                    totalDuration += sub.duration || 0
                  })
                }
              })
            }
          })
        }
      })
    }

    const instructor = course.instructor as any

    const responseData = {
      _id: course._id.toString(),
      title: course.title,
      description: course.description,
      shortDescription: course.shortDescription,
      slug: course.slug,
      price: course.price,
      isFree: course.isFree,
      level: course.level,
      category: course.category,
      tags: course.tags || [],
      thumbnail: course.thumbnail,
      previewVideo: course.previewVideo,
      requirements: course.requirements || [],
      learningOutcomes: course.learningOutcomes || [],
      instructor: instructor ? {
        _id: instructor._id.toString(),
        username: instructor.username || '',
        firstName: instructor.firstName || '',
        lastName: instructor.lastName || '',
        avatar: instructor.avatar || '',
        bio: instructor.bio || '',
        rating: instructor.rating || 0,
        totalStudents: instructor.totalStudents || 0,
        expertise: instructor.expertise || [],
      } : null,
      modules: course.modules || [],
      ratings: course.ratings?.map((r: any) => ({
        _id: r._id?.toString(),
        rating: r.rating,
        review: r.review,
        user: r.user ? {
          _id: r.user._id.toString(),
          username: r.user.username,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          avatar: r.user.avatar,
        } : null,
        createdAt: r.createdAt,
      })) || [],
      totalStudents: course.totalStudents || 0,
      averageRating: course.averageRating || 0,
      totalReviews: course.ratings?.length || 0,
      totalLessons,
      totalDuration,
      totalSubLessons,
      isEnrolled,
      canAccessContent,
      progress: userProgress ? {
        progress: userProgress.progress || 0,
        completed: userProgress.completed || false,
        lastAccessed: userProgress.lastAccessed,
        completedLessons: userProgress.completedLessons?.length || 0,
      } : null,
      isFeatured: course.isFeatured || false,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }

    return mobileSuccess(responseData)
  } catch (error: any) {
    console.error('Course detail error:', error)
    return mobileError(error.message || 'Failed to fetch course', 500)
  }
}