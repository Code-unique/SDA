import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import YouTubeCourse from '@/lib/models/YouTubeCourse'
import UserProgress from '@/lib/models/UserProgress'
import '@/lib/loadmodels'
import mongoose from 'mongoose'
import { isValidObjectId } from '@/lib/utils/objectId'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectToDatabase()

    const currentUserDoc = await User.findOne({ clerkId: user.id })
    if (!currentUserDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { error: 'Course slug is required' },
        { status: 400 }
      )
    }

    // Build query based on whether slug is ObjectId or regular slug
    let query: any = {}
    
    if (isValidObjectId(slug)) {
      query._id = new mongoose.Types.ObjectId(slug)
    } else {
      query.slug = slug
    }

    const course = await YouTubeCourse.findOne(query)
      .populate('instructor', 'username firstName lastName avatar')

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    if (!course.isPublished) {
      return NextResponse.json(
        { error: 'Course is not available' },
        { status: 403 }
      )
    }

    // Check if already enrolled via manual enrollment
    const existingEnrollment = course.manualEnrollments?.find(
      (enrollment: any) => 
        enrollment.user.toString() === currentUserDoc._id.toString() && 
        enrollment.status === 'approved'
    )

    if (existingEnrollment) {
      return NextResponse.json({
        alreadyEnrolled: true,
        message: 'Already enrolled in this course'
      })
    }

    // Check if enrollment request is pending
    const pendingEnrollment = course.manualEnrollments?.find(
      (enrollment: any) => 
        enrollment.user.toString() === currentUserDoc._id.toString() && 
        enrollment.status === 'pending'
    )

    if (pendingEnrollment) {
      return NextResponse.json({
        pending: true,
        message: 'Your enrollment request is pending approval'
      })
    }

    // For free courses with manual enrollment disabled
    if (course.isFree && !course.manualEnrollmentEnabled) {
      // Enroll user directly
      const userProgress = await UserProgress.create({
        courseId: course._id,
        userId: currentUserDoc._id,
        enrolled: true,
        progress: 0,
        completed: false,
        completedLessons: [],
        currentLesson: null,
        timeSpent: 0,
        lastAccessed: new Date()
      })

      // Update course student count
      await YouTubeCourse.findByIdAndUpdate(course._id, {
        $inc: { totalStudents: 1 }
      })

      return NextResponse.json({
        success: true,
        enrolled: true,
        message: 'Successfully enrolled in course',
        courseId: course._id,
        slug: course.slug,
        progress: userProgress
      })
    }

    // For paid courses or courses with manual enrollment
    if (!course.isFree || course.manualEnrollmentEnabled) {
      // Create manual enrollment request
      const enrollmentData = {
        user: currentUserDoc._id,
        status: 'pending',
        paymentMethod: '',
        transactionId: '',
        notes: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Get payment data from request body if provided
      const body = await request.json().catch(() => ({}))
      
      if (body.paymentMethod) {
        enrollmentData.paymentMethod = body.paymentMethod
      }
      if (body.transactionId) {
        enrollmentData.transactionId = body.transactionId
      }
      if (body.notes) {
        enrollmentData.notes = body.notes
      }
      if (body.paymentProof) {
        (enrollmentData as any).paymentProof = body.paymentProof
      }

      // Add enrollment request
      await YouTubeCourse.findByIdAndUpdate(course._id, {
        $push: {
          manualEnrollments: enrollmentData
        }
      })

      return NextResponse.json({
        requiresApproval: true,
        message: 'Enrollment request submitted for admin approval',
        courseId: course._id,
        courseTitle: course.title,
        price: course.price,
        isFree: course.isFree,
        manualEnrollmentEnabled: course.manualEnrollmentEnabled
      })
    }

    return NextResponse.json({
      error: 'Unable to process enrollment'
    }, { status: 400 })

  } catch (error: any) {
    console.error('Error enrolling in YouTube course:', error)
    return NextResponse.json(
      { error: 'Failed to enroll in course' },
      { status: 500 }
    )
  }
}