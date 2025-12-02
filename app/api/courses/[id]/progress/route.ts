import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course, { ICourse } from '@/lib/models/Course' // ADD TYPE IMPORT
import UserProgress from '@/lib/models/UserProgress'
import mongoose from 'mongoose'
import { NotificationService } from '@/lib/services/notificationService'

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
    
    let course: ICourse | null = null
    
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

    // Convert to plain object for serialization
    const progressData = userProgress.toObject ? userProgress.toObject() : userProgress
    
    return NextResponse.json({
      ...progressData,
      _id: (progressData._id as any)?.toString() || '',
      courseId: (progressData.courseId as any)?.toString() || '',
      userId: (progressData.userId as any)?.toString() || '',
      currentLesson: (progressData.currentLesson as any)?.toString() || null,
      completedLessons: (progressData.completedLessons || []).map((id: any) => id?.toString() || '')
    })
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
    
    let course: ICourse | null = null
    
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

    // Verify lesson exists in course and get its ObjectId
    let lessonObjectId: mongoose.Types.ObjectId | null = null
    let lessonExists = false

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

    // Calculate total lessons
    const totalLessons = course.modules.reduce((total: number, module: any) => 
      total + module.lessons.length, 0
    )

    // Update progress
    const updates: any = {
      lastAccessed: new Date(),
      timeSpent: (userProgress.timeSpent || 0) + timeSpent
    }

    if (current && lessonObjectId) {
      updates.currentLesson = lessonObjectId
    }

    let completedLessons = [...(userProgress.completedLessons || [])]
    
    if (completed && lessonObjectId && !completedLessons.some(id => 
      (id as any)?.toString() === lessonObjectId?.toString()
    )) {
      completedLessons.push(lessonObjectId)
      updates.completedLessons = completedLessons
      
      // Calculate new progress
      const newCompletedCount = completedLessons.length
      updates.progress = Math.min(newCompletedCount / totalLessons, 1)
      
      // Check if course is completed
      if (newCompletedCount === totalLessons) {
        updates.completed = true
        updates.completedAt = new Date()
        
        // CREATE COURSE COMPLETION NOTIFICATION
        if (currentUserDoc.notificationPreferences?.achievements) {
          await NotificationService.createNotification({
            userId: currentUserDoc._id,
            type: 'achievement',
            courseId: course._id as mongoose.Types.ObjectId, // FIX: Type cast
            message: `🎉 You completed "${course.title}"! Congratulations!`,
            actionUrl: `/courses/${course.slug || course._id}/certificate`
          });
        }
        
        // Also create a course completion notification
        if (currentUserDoc.notificationPreferences?.courses) {
          await NotificationService.createNotification({
            userId: currentUserDoc._id,
            type: 'course',
            courseId: course._id as mongoose.Types.ObjectId, // FIX: Type cast
            message: `You successfully completed "${course.title}"!`,
            actionUrl: `/profile/achievements`
          });
        }
      }
    }

    const updatedProgress = await UserProgress.findOneAndUpdate(
      { courseId: course._id, userId: currentUserDoc._id },
      updates,
      { new: true }
    )

    // Convert to plain object for serialization
    const progressData = updatedProgress?.toObject ? updatedProgress.toObject() : updatedProgress
    
    return NextResponse.json({
      ...progressData,
      _id: (progressData?._id as any)?.toString() || '',
      courseId: (progressData?.courseId as any)?.toString() || '',
      userId: (progressData?.userId as any)?.toString() || '',
      currentLesson: (progressData?.currentLesson as any)?.toString() || null,
      completedLessons: (progressData?.completedLessons || []).map((id: any) => id?.toString() || '')
    })
  } catch (error: any) {
    console.error('Error updating user progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}