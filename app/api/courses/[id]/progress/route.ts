import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course from '@/lib/models/Course'
import UserProgress from '@/lib/models/UserProgress'
import mongoose from 'mongoose'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
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
      course = await Course.findOne({
        _id: new mongoose.Types.ObjectId(id),
        'students.user': currentUserDoc._id
      })
    } else {
      // Search by slug
      course = await Course.findOne({
        slug: id,
        'students.user': currentUserDoc._id
      })
    }

    if (!course) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
    }

    // Get or create user progress using the course _id (not slug)
    let userProgress = await UserProgress.findOne({
      courseId: course._id,
      userId: currentUserDoc._id
    })

    if (!userProgress) {
      userProgress = await UserProgress.create({
        courseId: course._id,
        userId: currentUserDoc._id,
        completedLessons: [],
        currentLesson: course.modules[0]?.lessons[0]?._id || null,
        progress: 0,
        timeSpent: 0,
        lastAccessed: new Date(),
        completed: false
      })
    }

    return NextResponse.json(userProgress)
  } catch (error: any) {
    console.error('Error fetching user progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

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
    
    const currentUserDoc = await User.findOne({ clerkId: user.id })
    if (!currentUserDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params
    const body = await request.json()
    const { lessonId, completed, current, timeSpent = 0 } = body

    // Check if the ID is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id)
    
    let course
    
    if (isValidObjectId) {
      // Search by ObjectId
      course = await Course.findOne({
        _id: new mongoose.Types.ObjectId(id),
        'students.user': currentUserDoc._id
      })
    } else {
      // Search by slug
      course = await Course.findOne({
        slug: id,
        'students.user': currentUserDoc._id
      })
    }

    if (!course) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
    }

    // Verify lesson exists in course
    let lessonExists = false
    let lessonObjectId: mongoose.Types.ObjectId | null = null

    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (lesson._id?.toString() === lessonId) {
          lessonExists = true
          lessonObjectId = lesson._id ?? null
          break
        }
      }
      if (lessonExists) break
    }

    if (!lessonExists) {
      return NextResponse.json({ error: 'Lesson not found in course' }, { status: 404 })
    }

    // Get or create user progress using the course _id (not slug)
    let userProgress = await UserProgress.findOne({
      courseId: course._id,
      userId: currentUserDoc._id
    })

    if (!userProgress) {
      userProgress = await UserProgress.create({
        courseId: course._id,
        userId: currentUserDoc._id,
        completedLessons: [],
        currentLesson: lessonObjectId,
        progress: 0,
        timeSpent: 0,
        lastAccessed: new Date(),
        completed: false
      })
    }

    // Update progress
    const updates: any = {
      lastAccessed: new Date(),
      $inc: { timeSpent }
    }

    if (current && lessonObjectId) {
      updates.currentLesson = lessonObjectId
    }

    if (completed && lessonObjectId) {
      if (!userProgress.completedLessons.includes(lessonObjectId)) {
        updates.$addToSet = { completedLessons: lessonObjectId }
        
        // Calculate new progress
        const totalLessons = course.modules.reduce((total: number, module: any) => 
          total + module.lessons.length, 0
        )
        const newCompletedCount = userProgress.completedLessons.length + 1
        updates.progress = Math.min(newCompletedCount / totalLessons, 1)
        
        // Check if course is completed
        if (newCompletedCount === totalLessons) {
          updates.completed = true
          updates.completedAt = new Date()
        }
      }
    }

    const updatedProgress = await UserProgress.findOneAndUpdate(
      { courseId: course._id, userId: currentUserDoc._id },
      updates,
      { new: true }
    )

    return NextResponse.json(updatedProgress)
  } catch (error: any) {
    console.error('Error updating user progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}