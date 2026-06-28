// app/api/mobile/courses/[id]/enroll/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'
import UserProgress from '@/lib/models/UserProgress'
import { authenticateMobileRequest, mobileResponse, mobileError } from '@/lib/mobile-auth'
import mongoose from 'mongoose'
import "@/lib/loadmodels"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateMobileRequest(request)
    if (!auth.success) {
      return mobileError(auth.error || 'Unauthorized', auth.status || 401)
    }
    
    await connectToDatabase()
    const { id } = await params
    
    if (!id) {
      return mobileError('Course ID is required', 400)
    }
    
    // Find course
    let course
    if (mongoose.Types.ObjectId.isValid(id)) {
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
    
    // Check if already enrolled
    const isEnrolled = course.students?.some(
      (s: any) => s.user.toString() === auth.user._id.toString()
    )
    
    if (isEnrolled) {
      return mobileResponse({ alreadyEnrolled: true, message: 'Already enrolled' })
    }
    
    // For free courses
    if (course.isFree || course.price === 0) {
      await Course.findByIdAndUpdate(course._id, {
        $push: {
          students: {
            user: auth.user._id,
            enrolledAt: new Date(),
            progress: 0,
            completed: false
          }
        },
        $inc: { totalStudents: 1 }
      })
      
      // Create progress
      const progress = await UserProgress.create({
        courseId: course._id,
        userId: auth.user._id,
        completedLessons: [],
        progress: 0,
        timeSpent: 0,
        lastAccessed: new Date(),
        completed: false
      })
      
      return mobileResponse({
        success: true,
        enrolled: true,
        message: 'Successfully enrolled in course',
        courseId: course._id.toString(),
        progress: {
          _id: progress._id.toString(),
          progress: progress.progress,
          completed: progress.completed
        }
      })
    }
    
    // Paid course
    return mobileResponse({
      requiresPayment: true,
      price: course.price,
      courseId: course._id.toString(),
      courseTitle: course.title,
      message: 'This course requires payment'
    }, 402)
    
  } catch (error: any) {
    console.error('Mobile enroll error:', error)
    return mobileError('Failed to enroll: ' + error.message, 500)
  }
}