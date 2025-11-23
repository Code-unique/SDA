import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course from '@/lib/models/Course'
import UserProgress from '@/lib/models/UserProgress'
import mongoose from 'mongoose'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    // Get the current user from database
    const currentUserDoc = await User.findOne({ clerkId: user.id })
    if (!currentUserDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params

    // Check if the ID is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id)
    
    let course
    
    if (isValidObjectId) {
      // Search by ObjectId
      course = await Course.findById(id)
    } else {
      // Search by slug
      course = await Course.findOne({ slug: id })
    }

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (!course.isPublished) {
      return NextResponse.json({ error: 'Course is not available' }, { status: 403 })
    }

    // Check if user is already enrolled
    const isAlreadyEnrolled = course.students.some(
      (student: any) => student.user.toString() === currentUserDoc._id.toString()
    )

    if (isAlreadyEnrolled) {
      // Get existing progress
      const existingProgress = await UserProgress.findOne({
        courseId: course._id,
        userId: currentUserDoc._id
      })

      return NextResponse.json({ 
        alreadyEnrolled: true,
        message: 'Already enrolled in this course',
        courseId: course._id,
        slug: course.slug,
        progress: existingProgress
      })
    }

    // Add user to course students with proper data structure
    const updatedCourse = await Course.findByIdAndUpdate(
      course._id,
      {
        $push: {
          students: {
            user: currentUserDoc._id,
            enrolledAt: new Date(),
            progress: 0,
            completed: false
          }
        },
        $inc: { totalStudents: 1 }
      },
      { new: true }
    ).populate('instructor', 'firstName lastName username avatar bio rating totalStudents')

    if (!updatedCourse) {
      throw new Error('Failed to update course enrollment')
    }

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

    // Create enrollment activity (optional - if you have activities collection)
    try {
      await mongoose.connection.collection('activities').insertOne({
        type: 'enrollment',
        userId: currentUserDoc._id,
        courseId: course._id,
        courseTitle: course.title,
        createdAt: new Date(),
        metadata: {
          price: course.price,
          isFree: course.isFree,
          instructor: course.instructor
        }
      })
    } catch (activityError) {
      console.warn('Failed to create activity log:', activityError)
      // Continue even if activity logging fails
    }

    return NextResponse.json({
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
      }
    })

  } catch (error: any) {
    console.error('Error enrolling in course:', error)
    
    // More detailed error response
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors)
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message
          }))
        }, 
        { status: 400 }
      )
    }
    
    // Handle duplicate key errors (if user somehow gets enrolled twice)
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          alreadyEnrolled: true,
          message: 'Already enrolled in this course'
        }, 
        { status: 200 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}