// app/api/mobile/courses/[id]/progress/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'
import UserProgress from '@/lib/models/UserProgress'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { isValidObjectId } from '@/lib/mobile/validation'
import mongoose from 'mongoose'
import "@/lib/loadmodels"

/**
 * GET /api/mobile/courses/:id/progress
 * Get user progress for a course
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Check if enrolled
    const isEnrolled = course.students?.some(
      (s: any) => s.user.toString() === authResult.user._id.toString()
    )

    if (!isEnrolled) {
      return mobileError('Not enrolled in this course', 403)
    }

    let progress = await UserProgress.findOne({
      courseId: course._id,
      userId: authResult.user._id,
    })

    // Calculate total content items
    let totalContentItems = 0
    if (course.modules) {
      course.modules.forEach((module: any) => {
        if (module.chapters) {
          module.chapters.forEach((chapter: any) => {
            if (chapter.lessons) {
              chapter.lessons.forEach((lesson: any) => {
                if (lesson.videoSource) totalContentItems++
                if (lesson.subLessons) {
                  lesson.subLessons.forEach((sub: any) => {
                    if (sub.videoSource) totalContentItems++
                  })
                }
              })
            }
          })
        }
      })
    }

    if (!progress) {
      progress = await UserProgress.create({
        courseId: course._id,
        userId: authResult.user._id,
        completedLessons: [],
        progress: 0,
        timeSpent: 0,
        lastAccessed: new Date(),
        completed: false,
      })
    }

    return mobileSuccess({
      _id: progress._id.toString(),
      courseId: progress.courseId.toString(),
      userId: progress.userId.toString(),
      progress: progress.progress || 0,
      completed: progress.completed || false,
      completedLessons: progress.completedLessons?.map((id: any) => id.toString()) || [],
      currentLesson: progress.currentLesson?.toString() || null,
      contentType: progress.contentType || null,
      timeSpent: progress.timeSpent || 0,
      lastAccessed: progress.lastAccessed,
      totalContentItems,
      completedCount: progress.completedLessons?.length || 0,
    })
  } catch (error: any) {
    console.error('Get progress error:', error)
    return mobileError(error.message || 'Failed to fetch progress', 500)
  }
}

/**
 * POST /api/mobile/courses/:id/progress
 * Update user progress
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { lessonId, completed, current, timeSpent = 0, contentType = 'sublesson' } = body

    if (!lessonId) {
      return mobileError('lessonId is required', 400)
    }

    if (!isValidObjectId(lessonId)) {
      return mobileError('Invalid lessonId format', 400)
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

    // Check if enrolled
    const isEnrolled = course.students?.some(
      (s: any) => s.user.toString() === authResult.user._id.toString()
    )

    if (!isEnrolled) {
      return mobileError('Not enrolled in this course', 403)
    }

    // Get or create progress
    let progress = await UserProgress.findOne({
      courseId: course._id,
      userId: authResult.user._id,
    })

    if (!progress) {
      progress = await UserProgress.create({
        courseId: course._id,
        userId: authResult.user._id,
        completedLessons: [],
        progress: 0,
        timeSpent: 0,
        lastAccessed: new Date(),
        completed: false,
      })
    }

    // Calculate total content items
    let totalContentItems = 0
    if (course.modules) {
      course.modules.forEach((module: any) => {
        if (module.chapters) {
          module.chapters.forEach((chapter: any) => {
            if (chapter.lessons) {
              chapter.lessons.forEach((lesson: any) => {
                if (lesson.videoSource) totalContentItems++
                if (lesson.subLessons) {
                  lesson.subLessons.forEach((sub: any) => {
                    if (sub.videoSource) totalContentItems++
                  })
                }
              })
            }
          })
        }
      })
    }

    // Update progress
    const updates: any = {
      lastAccessed: new Date(),
      timeSpent: (progress.timeSpent || 0) + timeSpent,
    }

    if (current) {
      updates.currentLesson = new mongoose.Types.ObjectId(lessonId)
      updates.contentType = contentType
    }

    let completedLessons = [...(progress.completedLessons || [])]

    if (completed && !completedLessons.some((id: any) => id.toString() === lessonId)) {
      completedLessons.push(new mongoose.Types.ObjectId(lessonId))
      updates.completedLessons = completedLessons

      const newCompletedCount = completedLessons.length
      updates.progress = totalContentItems > 0 ? Math.min(newCompletedCount / totalContentItems, 1) : 0

      if (newCompletedCount >= totalContentItems) {
        updates.completed = true
        updates.completedAt = new Date()
      }
    }

    const updatedProgress = await UserProgress.findOneAndUpdate(
      { courseId: course._id, userId: authResult.user._id },
      updates,
      { new: true }
    )

    return mobileSuccess({
      _id: updatedProgress._id.toString(),
      courseId: updatedProgress.courseId.toString(),
      userId: updatedProgress.userId.toString(),
      progress: updatedProgress.progress || 0,
      completed: updatedProgress.completed || false,
      completedLessons: updatedProgress.completedLessons?.map((id: any) => id.toString()) || [],
      currentLesson: updatedProgress.currentLesson?.toString() || null,
      contentType: updatedProgress.contentType || null,
      timeSpent: updatedProgress.timeSpent || 0,
      lastAccessed: updatedProgress.lastAccessed,
      totalContentItems,
      completedCount: updatedProgress.completedLessons?.length || 0,
    })
  } catch (error: any) {
    console.error('Update progress error:', error)
    return mobileError(error.message || 'Failed to update progress', 500)
  }
}