import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course from '@/lib/models/Course'
import '@/lib/loadmodels'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()

    const adminUser = await User.findOne({ clerkId: user.id })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!id || id.length !== 24) {
      return NextResponse.json(
        { error: 'Invalid course ID' },
        { status: 400 }
      )
    }

    const course = await Course.findById(id)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Toggle publish state
    course.isPublished = !course.isPublished
    await course.save()

    return NextResponse.json({
      _id: course._id,
      title: course.title,
      isPublished: course.isPublished,
      message: `Course ${course.isPublished ? 'published' : 'unpublished'} successfully`
    }, { status: 200 })
  } catch (error) {
    console.error('Error updating course publish status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}