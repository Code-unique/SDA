import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course from '@/lib/models/Course'
import UserProgress from '@/lib/models/UserProgress'
import PendingEnrollment from '@/lib/models/PendingEnrollment'
import Payment from '@/lib/models/Payment'
import { retrieveStripePaymentIntent } from '@/lib/payment/stripe'
import { verifyKhaltiPayment } from '@/lib/payment/khalti'
import { rateLimit } from '@/lib/rate-limit'
import mongoose from 'mongoose'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitKey = `payment_verify:${user.id}`
    const rateLimitResult = rateLimit(rateLimitKey, 10) // 10 attempts per minute
    
    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' }, 
        { status: 429, headers: rateLimitResult.headers }
      )
    }

    await connectToDatabase()
    
    const currentUserDoc = await User.findOne({ clerkId: user.id })
    if (!currentUserDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params
    const { paymentMethod, paymentIntentId, pidx } = await request.json()

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method required' }, { status: 400 })
    }

    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 })
    }

    const course = await Course.findById(id)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check if already enrolled
    const isAlreadyEnrolled = course.students.some(
      (student: any) => student.user.toString() === currentUserDoc._id.toString()
    )

    if (isAlreadyEnrolled) {
      return NextResponse.json({ 
        alreadyEnrolled: true,
        message: 'Already enrolled in this course'
      })
    }

    let paymentVerified = false
    let pendingEnrollment: any = null
    let transactionId = ''
    let paymentAmount = 0

    if (paymentMethod === 'stripe' && paymentIntentId) {
      // Find pending enrollment
      pendingEnrollment = await PendingEnrollment.findOne({
        paymentIntentId,
        userId: currentUserDoc._id,
        status: 'pending'
      })

      if (!pendingEnrollment) {
        return NextResponse.json({ 
          error: 'Pending enrollment not found or expired',
          verified: false 
        }, { status: 404 })
      }

      // Verify Stripe payment
      const paymentIntent = await retrieveStripePaymentIntent(paymentIntentId)
      
      if (paymentIntent.status === 'succeeded') {
        paymentVerified = true
        transactionId = paymentIntentId
        paymentAmount = pendingEnrollment.amount
      } else {
        // Update pending enrollment status based on payment intent status
        await PendingEnrollment.findByIdAndUpdate(
          pendingEnrollment._id,
          { 
            status: paymentIntent.status === 'canceled' ? 'failed' : 'pending',
            ...(paymentIntent.status === 'canceled' && { completedAt: new Date() })
          }
        )
      }

    } else if (paymentMethod === 'khalti' && pidx) {
      // Find pending enrollment
      pendingEnrollment = await PendingEnrollment.findOne({
        pidx,
        userId: currentUserDoc._id,
        status: 'pending'
      })

      if (!pendingEnrollment) {
        return NextResponse.json({ 
          error: 'Pending enrollment not found or expired',
          verified: false 
        }, { status: 404 })
      }

      // Verify Khalti payment
      const verification = await verifyKhaltiPayment(pidx)
      
      if (verification.status === 'Completed') {
        paymentVerified = true
        transactionId = pidx
        paymentAmount = pendingEnrollment.amount
      } else if (verification.status === 'Expired') {
        // Update expired enrollment
        await PendingEnrollment.findByIdAndUpdate(
          pendingEnrollment._id,
          { 
            status: 'failed',
            completedAt: new Date()
          }
        )
      }
    }

    if (!paymentVerified || !pendingEnrollment) {
      return NextResponse.json({ 
        error: 'Payment not verified or enrollment expired',
        verified: false 
      }, { status: 400 })
    }

    // Enroll user in course
    await Course.findByIdAndUpdate(
      course._id,
      {
        $push: {
          students: {
            user: currentUserDoc._id,
            enrolledAt: new Date(),
            progress: 0,
            completed: false,
            paymentMethod: paymentMethod,
            paymentAmount: paymentAmount,
            enrolledThrough: 'payment'
          }
        },
        $inc: { totalStudents: 1 }
      }
    )

    // Create initial user progress
    const firstLesson = course.modules[0]?.lessons[0]
    const userProgress = await UserProgress.create({
      courseId: course._id,
      userId: currentUserDoc._id,
      completedLessons: [],
      currentLesson: firstLesson?._id || null,
      progress: 0,
      timeSpent: 0,
      lastAccessed: new Date(),
      completed: false
    })

    // Update pending enrollment to completed
    await PendingEnrollment.findByIdAndUpdate(
      pendingEnrollment._id,
      { 
        status: 'completed',
        completedAt: new Date()
      }
    )

    // Create payment record
    await Payment.create({
      userId: currentUserDoc._id,
      courseId: course._id,
      amount: paymentAmount,
      currency: paymentMethod === 'khalti' ? 'npr' : 'usd',
      paymentMethod: paymentMethod,
      status: 'completed',
      transactionId: transactionId,
      paymentIntentId: paymentMethod === 'stripe' ? paymentIntentId : undefined,
      pidx: paymentMethod === 'khalti' ? pidx : undefined,
      metadata: {
        courseTitle: course.title,
        instructorId: course.instructor._id,
        userEmail: user.emailAddresses[0]?.emailAddress || '',
        userName: `${currentUserDoc.firstName} ${currentUserDoc.lastName}`
      }
    })

    // Create enrollment activity
    await mongoose.connection.collection('activities').insertOne({
      type: 'enrollment',
      userId: currentUserDoc._id,
      courseId: course._id,
      courseTitle: course.title,
      createdAt: new Date(),
      metadata: {
        price: course.price,
        isFree: course.isFree,
        instructor: course.instructor,
        paymentMethod: paymentMethod,
        paymentAmount: paymentAmount
      }
    })

    // Get updated course
    const updatedCourse = await Course.findById(course._id)
      .populate('instructor', 'firstName lastName username avatar bio rating totalStudents')

    // Fix: Add null check for updatedCourse
    if (!updatedCourse) {
      throw new Error('Failed to retrieve updated course data')
    }

    return NextResponse.json({
      success: true,
      enrolled: true,
      message: 'Successfully enrolled in course',
      courseId: course._id,
      slug: course.slug,
      progress: userProgress,
      course: {
        _id: updatedCourse._id,
        title: updatedCourse.title,
        totalStudents: updatedCourse.totalStudents,
        instructor: updatedCourse.instructor
      },
      headers: rateLimitResult.headers
    })

  } catch (error: any) {
    console.error('Error verifying payment and enrolling:', error)
    
    if (error.name === 'StripeError') {
      return NextResponse.json(
        { error: `Payment verification error: ${error.message}` }, 
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to verify payment and enroll' }, 
      { status: 500 }
    )
  }
}