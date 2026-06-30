// app/api/mobile/courses/[id]/enroll/route.ts - Updated without transaction
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'
import UserProgress from '@/lib/models/UserProgress'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId } from '@/lib/mobile/validation'
import { strictRateLimit } from '@/lib/mobile/rate-limit'
import "@/lib/loadmodels"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await strictRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    const { id } = await params

    if (!id) {
      return mobileError('Course ID is required', 400)
    }

    await connectToDatabase()

    let course
    if (isValidObjectId(id)) {
      course = await Course.findById(id)
    } else {
      course = await Course.findOne({ slug: id })
    }

    if (!course) {
      return mobileError('Course not found', 404)
    }

    if (!course.isPublished) {
      return mobileError('Course is not available', 403)
    }

    const isEnrolled = course.students?.some(
      (s: any) => s.user.toString() === authResult.user._id.toString()
    )

    if (isEnrolled) {
      return mobileSuccess({
        alreadyEnrolled: true,
        message: 'Already enrolled in this course',
      })
    }

    if (course.isFree || course.price === 0) {
      await Course.findByIdAndUpdate(course._id, {
        $push: {
          students: {
            user: authResult.user._id,
            enrolledAt: new Date(),
            progress: 0,
            completed: false,
            enrolledThrough: 'free',
          }
        },
        $inc: { totalStudents: 1 }
      })

      let firstContentId = null
      let contentType = null

      if (course.modules && course.modules.length > 0) {
        for (const module of course.modules) {
          if (module.chapters) {
            for (const chapter of module.chapters) {
              if (chapter.lessons && chapter.lessons.length > 0) {
                const lesson = chapter.lessons[0]
                if (lesson.videoSource) {
                  firstContentId = lesson._id
                  contentType = 'lesson'
                  break
                }
                if (lesson.subLessons && lesson.subLessons.length > 0) {
                  const subLesson = lesson.subLessons[0]
                  if (subLesson.videoSource) {
                    firstContentId = subLesson._id
                    contentType = 'sublesson'
                    break
                  }
                }
              }
              if (firstContentId) break
            }
          }
          if (firstContentId) break
        }
      }

      const progress = await UserProgress.create({
        courseId: course._id,
        userId: authResult.user._id,
        completedLessons: [],
        currentLesson: firstContentId,
        contentType: contentType,
        progress: 0,
        timeSpent: 0,
        lastAccessed: new Date(),
        completed: false,
      })

      return mobileSuccess({
        success: true,
        enrolled: true,
        message: 'Successfully enrolled in course',
        courseId: course._id.toString(),
        progress: {
          _id: progress._id.toString(),
          progress: progress.progress,
          completed: progress.completed,
          lastAccessed: progress.lastAccessed,
          currentLesson: progress.currentLesson?.toString() || null,
        },
      })
    }

    return mobileSuccess({
      requiresPayment: true,
      price: course.price,
      courseId: course._id.toString(),
      courseTitle: course.title,
      message: 'This course requires payment',
    }, undefined, 402)

  } catch (error: any) {
    console.error('Enroll error:', error)
    return mobileError(error.message || 'Failed to enroll in course', 500)
  }
}