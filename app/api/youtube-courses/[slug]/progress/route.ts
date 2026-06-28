import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import YouTubeCourse from '@/lib/models/YouTubeCourse'
import UserProgress from '@/lib/models/UserProgress'
import '@/lib/loadmodels'
import mongoose from 'mongoose'
import { isValidObjectId } from '@/lib/utils/objectId'

// GET user progress
// In the GET function, update the enrollment check:

export async function GET(
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
        { error: 'Course identifier is required' },
        { status: 400 }
      )
    }

    // Build query
    let query: any = {}
    
    if (isValidObjectId(slug)) {
      query._id = new mongoose.Types.ObjectId(slug)
    } else {
      query.slug = slug
    }

    const course = await YouTubeCourse.findOne(query)

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Check if course is free with auto enrollment
    if (course.isFree && !course.manualEnrollmentEnabled) {
      // User should have access automatically
      const progress = await UserProgress.findOne({
        courseId: course._id,
        userId: currentUserDoc._id
      })

      if (progress) {
        return NextResponse.json(progress)
      }

      // Create progress if not exists
      const newProgress = await UserProgress.create({
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

      return NextResponse.json(newProgress)
    }

    // Check manual enrollment status
    const enrollment = course.manualEnrollments?.find(
      (enrollment: any) => 
        enrollment.user.toString() === currentUserDoc._id.toString()
    )

    // If manual enrollment is enabled, check if user is approved
    if (course.manualEnrollmentEnabled) {
      if (!enrollment || enrollment.status !== 'approved') {
        return NextResponse.json({
          enrolled: false,
          progress: 0,
          completed: false,
          completedLessons: []
        })
      }
    }

    // Get user progress
    const progress = await UserProgress.findOne({
      courseId: course._id,
      userId: currentUserDoc._id
    })

    if (!progress) {
      // Create default progress if not exists but user should have access
      if (!course.manualEnrollmentEnabled || enrollment?.status === 'approved') {
        const newProgress = await UserProgress.create({
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

        return NextResponse.json(newProgress)
      }

      return NextResponse.json({
        enrolled: false,
        progress: 0,
        completed: false,
        completedLessons: []
      })
    }

    return NextResponse.json(progress)
    
  } catch (error: any) {
    console.error('Error fetching progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST update progress
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
    const body = await request.json()
    const { lessonId, completed, current } = body

    // Build query based on whether slug is ObjectId or regular slug
    let query: any = {}
    
    if (isValidObjectId(slug)) {
      query._id = new mongoose.Types.ObjectId(slug)
    } else {
      query.slug = slug
    }

    const course = await YouTubeCourse.findOne(query)

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Check if user is enrolled
    const enrollment = course.manualEnrollments?.find(
      (enrollment: any) => 
        enrollment.user.toString() === currentUserDoc._id.toString() &&
        enrollment.status === 'approved'
    )

    if (!enrollment && course.manualEnrollmentEnabled) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      )
    }

    // Get or create progress
    let progress = await UserProgress.findOne({
      courseId: course._id,
      userId: currentUserDoc._id
    })

    if (!progress) {
      progress = await UserProgress.create({
        courseId: course._id,
        userId: currentUserDoc._id,
        enrolled: true,
        progress: 0,
        completed: false,
        completedLessons: [],
        currentLesson: current ? lessonId : null,
        timeSpent: 0,
        lastAccessed: new Date()
      })
    }

    // Update progress
    if (current) {
      progress.currentLesson = lessonId
      progress.lastAccessed = new Date()
    }

    if (completed && lessonId) {
      if (!progress.completedLessons.includes(lessonId)) {
        progress.completedLessons.push(lessonId)
        
        // Calculate total content items
        let totalItems = 0
        course.modules.forEach((module: any) => {
          module.chapters.forEach((chapter: any) => {
            totalItems += chapter.lessons.length
            chapter.lessons.forEach((lesson: any) => {
              totalItems += lesson.subLessons?.length || 0
            })
          })
        })

        // Update progress percentage
        progress.progress = totalItems > 0 ? progress.completedLessons.length / totalItems : 0
        
        // Check if course is completed
        if (progress.progress >= 1) {
          progress.completed = true
          progress.completedAt = new Date()
        }
      }
    }

    // Update time spent (add 1 minute for each progress update)
    progress.timeSpent += 60

    await progress.save()

    return NextResponse.json(progress)
    
  } catch (error: any) {
    console.error('Error updating progress:', error)
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    )
  }
}