import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course from '@/lib/models/Course'
import UserProgress from '@/lib/models/UserProgress'
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

    const rateLimitKey = `enroll:${user.id}`
    const rateLimitResult = rateLimit(rateLimitKey, 5) // 5 attempts per minute
    
    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        { error: 'Too many enrollment attempts. Please try again later.' }, 
        { status: 429, headers: rateLimitResult.headers }
      )
    }

    await connectToDatabase()
    
    const currentUserDoc = await User.findOne({ clerkId: user.id })
    if (!currentUserDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params

    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 })
    }
    
    let course
    
    // Try by ObjectId first, then by slug
    if (mongoose.Types.ObjectId.isValid(id)) {
      course = await Course.findById(id)
    } else {
      course = await Course.findOne({ slug: id })
    }

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (!course.isPublished) {
      return NextResponse.json({ error: 'Course is not available' }, { status: 403 })
    }

    // Check if user is already enrolled using your Course model
    const isAlreadyEnrolled = course.students.some(
      (student: any) => student.user.toString() === currentUserDoc._id.toString()
    )

    if (isAlreadyEnrolled) {
      return NextResponse.json({ 
        alreadyEnrolled: true,
        message: 'Already enrolled in this course'
      })
    }

    // For paid courses, redirect to payment
    if (!course.isFree && course.price > 0) {
      return NextResponse.json({ 
        requiresPayment: true,
        price: course.price,
        message: 'Course requires payment'
      }, { status: 402 }) // Payment Required
    }

    // For free courses, use your Course model's addStudent method
    await Course.findByIdAndUpdate(
      course._id,
      {
        $push: {
          students: {
            user: currentUserDoc._id,
            enrolledAt: new Date(),
            progress: 0,
            completed: false,
            enrolledThrough: 'free'
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
        enrolledThrough: 'free'
      }
    })

    // Refresh course data to get updated student count
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
    console.error('Error enrolling in course:', error)
    
    return NextResponse.json(
      { error: 'Failed to enroll in course' }, 
      { status: 500 }
    )
  }
}