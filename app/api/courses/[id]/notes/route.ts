import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course from '@/lib/models/Course'
import UserProgress from '@/lib/models/UserProgress'

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
    const { lessonId, notes } = body

    // Check if user is enrolled
    const course = await Course.findOne({
      _id: id,
      'students.user': currentUserDoc._id
    })

    if (!course) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
    }

    // Get user progress
    let userProgress = await UserProgress.findOne({
      courseId: id,
      userId: currentUserDoc._id
    })

    if (!userProgress) {
      userProgress = await UserProgress.create({
        courseId: id,
        userId: currentUserDoc._id,
        completedLessons: [],
        currentLesson: lessonId,
        progress: 0,
        timeSpent: 0,
        lastAccessed: new Date(),
        completed: false,
        notes: []
      })
    }

    // Update or add note
    const noteIndex = userProgress.notes.findIndex((note: any) => 
      note.lessonId.toString() === lessonId
    )

    if (noteIndex > -1) {
      // Update existing note
      userProgress.notes[noteIndex].content = notes
      userProgress.notes[noteIndex].updatedAt = new Date()
    } else {
      // Add new note
      userProgress.notes.push({
        lessonId,
        content: notes,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    await userProgress.save()

    return NextResponse.json({ success: true, notes: userProgress.notes })
  } catch (error: any) {
    console.error('Error saving notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

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
    const { searchParams } = new URL(request.url)
    const lessonId = searchParams.get('lessonId')

    // Get user progress with notes
    const userProgress = await UserProgress.findOne({
      courseId: id,
      userId: currentUserDoc._id
    })

    if (!userProgress) {
      return NextResponse.json({ notes: [] })
    }

    if (lessonId) {
      const note = userProgress.notes.find((note: any) => 
        note.lessonId.toString() === lessonId
      )
      return NextResponse.json({ note: note || null })
    }

    return NextResponse.json({ notes: userProgress.notes })
  } catch (error: any) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}