import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course from '@/lib/models/Course'

// GET - Fetch single course for admin
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
    
    // Verify admin role
    const adminUser = await User.findOne({ clerkId: user.id })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const course = await Course.findById(id)
      .populate('instructor', 'username firstName lastName avatar')
      .populate('students.user', 'username firstName lastName avatar')

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json(course)
  } catch (error: any) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// DELETE - Delete course
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    // Verify admin role
    const adminUser = await User.findOne({ clerkId: user.id })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const course = await Course.findByIdAndDelete(id)

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// PATCH - Update course
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()
    
    const adminUser = await User.findOne({ clerkId: user.id })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    
    const {
      title,
      description,
      shortDescription,
      price,
      isFree,
      level,
      category,
      tags,
      thumbnail,
      previewVideo,
      modules,
      requirements,
      learningOutcomes,
      isFeatured,
      isPublished
    } = body

    // Find existing course
    const existingCourse = await Course.findById(id)
    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Generate new slug if title changed
    let slug = existingCourse.slug
    if (title && title !== existingCourse.title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
    }

    // Transform modules data
    const transformedModules = modules?.map((module: any, index: number) => ({
      _id: module._id || undefined,
      title: module.title,
      description: module.description,
      order: module.order !== undefined ? module.order : index,
      lessons: module.lessons?.map((lesson: any, lessonIndex: number) => ({
        _id: lesson._id || undefined,
        title: lesson.title,
        description: lesson.description,
        content: lesson.content || '',
        video: lesson.video,
        duration: lesson.duration || 0,
        isPreview: lesson.isPreview || false,
        resources: lesson.resources || [],
        order: lesson.order !== undefined ? lesson.order : lessonIndex
      })) || []
    })) || []

    // Update course
    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      {
        ...(title && { title }),
        ...(description && { description }),
        ...(shortDescription && { shortDescription }),
        ...(price !== undefined && { price }),
        ...(isFree !== undefined && { isFree }),
        ...(level && { level }),
        ...(category && { category }),
        ...(tags && { tags }),
        ...(thumbnail && { thumbnail }),
        ...(previewVideo && { previewVideo }),
        ...(modules && { modules: transformedModules }),
        ...(requirements && { requirements }),
        ...(learningOutcomes && { learningOutcomes }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(isPublished !== undefined && { isPublished }),
        ...(slug && { slug })
      },
      { new: true, runValidators: true }
    ).populate('instructor', 'username firstName lastName avatar')

    if (!updatedCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json(updatedCourse)
  } catch (error: any) {
    console.error('Error updating course:', error)
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Course with this title already exists' }, 
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    )
  }
}