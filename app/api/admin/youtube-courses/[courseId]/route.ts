import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import YouTubeCourse from '@/lib/models/YouTubeCourse'
import mongoose from 'mongoose'
import '@/lib/loadmodels'

// Define interfaces
interface Course {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  instructor?: any;
  price: number;
  isFree: boolean;
  level?: string;
  category?: string;
  tags?: string[];
  thumbnail?: string;
  previewVideo?: any;
  modules?: any[];
  requirements?: string[];
  learningOutcomes?: string[];
  isPublished: boolean;
  isFeatured: boolean;
  manualEnrollmentEnabled: boolean;
  totalStudents: number;
  averageRating: number;
  ratings?: any[];
  createdAt: Date;
  updatedAt: Date;
}

// GET - Get single course by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    console.log('GET /api/admin/youtube-courses/[courseId] called')
    
    const { courseId } = await params
    
    if (!courseId || courseId.trim() === '') {
      return NextResponse.json(
        { error: 'Course identifier is required' },
        { status: 400 }
      )
    }

    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectToDatabase()

    const adminUser = await User.findOne({ clerkId: user.id })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    let course: Course | null = null
    
    if (mongoose.isValidObjectId(courseId)) {
      course = await YouTubeCourse.findById(courseId)
        .populate('instructor', 'username firstName lastName avatar')
        .populate({
          path: 'manualEnrollments.user',
          select: 'username firstName lastName email avatar'
        })
        .populate({
          path: 'manualEnrollments.approvedBy',
          select: 'username firstName lastName'
        })
        .lean() as Course | null
    }
    
    if (!course) {
      course = await YouTubeCourse.findOne({ slug: courseId })
        .populate('instructor', 'username firstName lastName avatar')
        .populate({
          path: 'manualEnrollments.user',
          select: 'username firstName lastName email avatar'
        })
        .populate({
          path: 'manualEnrollments.approvedBy',
          select: 'username firstName lastName'
        })
        .lean() as Course | null
    }

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    const courseWithStringId = {
      ...course,
      _id: course._id.toString(),
      totalReviews: course.ratings?.length || 0
    }

    return NextResponse.json(courseWithStringId)
    
  } catch (error: any) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

// PUT - Update course (COMPLETE OVERWRITE)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    console.log('PUT /api/admin/youtube-courses/[courseId] called')
    
    const { courseId } = await params
    
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectToDatabase()

    const adminUser = await User.findOne({ clerkId: user.id })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    let course: Course | null = null
    
    if (mongoose.isValidObjectId(courseId)) {
      course = await YouTubeCourse.findById(courseId) as Course | null
    }
    
    if (!course) {
      course = await YouTubeCourse.findOne({ slug: courseId }) as Course | null
    }
    
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Generate new slug if title changed
    let slug = course.slug
    if (body.title && body.title !== course.title) {
      const newSlug = body.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100)
      
      // Check if slug already exists for another course
      const existingCourse = await YouTubeCourse.findOne({ 
        slug: newSlug,
        _id: { $ne: course._id }
      })
      
      if (existingCourse) {
        // Add timestamp to make unique
        slug = `${newSlug}-${Date.now()}`.substring(0, 100)
      } else {
        slug = newSlug
      }
    }

    // Prepare update object - COMPLETE OVERWRITE
    const updateData = {
      title: body.title?.substring(0, 100) || course.title,
      slug: slug,
      description: body.description !== undefined ? body.description : course.description,
      shortDescription: body.shortDescription !== undefined ? body.shortDescription?.substring(0, 200) : course.shortDescription,
      price: body.isFree ? 0 : (body.price !== undefined ? Math.max(0, body.price) : course.price),
      isFree: body.isFree !== undefined ? !!body.isFree : course.isFree,
      level: body.level || course.level || 'beginner',
      category: body.category !== undefined ? (body.category ? body.category.substring(0, 50) : undefined) : course.category,
      tags: body.tags !== undefined ? (Array.isArray(body.tags) ? body.tags.slice(0, 10).map((t: string) => t.substring(0, 30)) : []) : course.tags || [],
      thumbnail: body.thumbnail !== undefined ? body.thumbnail : course.thumbnail,
      previewVideo: body.previewVideo !== undefined ? body.previewVideo : course.previewVideo,
      
      // ✅ CRITICAL FIX: Update modules array
      modules: body.modules !== undefined ? body.modules : course.modules || [],
      
      requirements: body.requirements !== undefined ? (Array.isArray(body.requirements) ? body.requirements.slice(0, 10).map((r: string) => r.substring(0, 200)) : []) : course.requirements || [],
      learningOutcomes: body.learningOutcomes !== undefined ? (Array.isArray(body.learningOutcomes) ? body.learningOutcomes.slice(0, 10).map((l: string) => l.substring(0, 200)) : []) : course.learningOutcomes || [],
      isPublished: body.isPublished !== undefined ? !!body.isPublished : course.isPublished,
      isFeatured: body.isFeatured !== undefined ? !!body.isFeatured : course.isFeatured,
      manualEnrollmentEnabled: body.manualEnrollmentEnabled !== undefined ? body.manualEnrollmentEnabled !== false : course.manualEnrollmentEnabled
    }

    console.log('Updating course with modules:', updateData.modules ? `${updateData.modules.length} modules` : 'none')

    const updatedCourse = await YouTubeCourse.findByIdAndUpdate(
      course._id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('instructor', 'username firstName lastName avatar')

    if (!updatedCourse) {
      return NextResponse.json(
        { error: 'Failed to update course' },
        { status: 500 }
      )
    }

    console.log('Course updated successfully:', updatedCourse.title)

    // ✅ CRITICAL FIX: Return course directly, not nested
    return NextResponse.json({
      _id: updatedCourse._id.toString(),
      title: updatedCourse.title,
      slug: updatedCourse.slug,
      description: updatedCourse.description,
      shortDescription: updatedCourse.shortDescription,
      instructor: updatedCourse.instructor,
      price: updatedCourse.price,
      isFree: updatedCourse.isFree,
      level: updatedCourse.level,
      category: updatedCourse.category,
      tags: updatedCourse.tags,
      thumbnail: updatedCourse.thumbnail,
      previewVideo: updatedCourse.previewVideo,
      modules: updatedCourse.modules,
      requirements: updatedCourse.requirements,
      learningOutcomes: updatedCourse.learningOutcomes,
      isPublished: updatedCourse.isPublished,
      isFeatured: updatedCourse.isFeatured,
      manualEnrollmentEnabled: updatedCourse.manualEnrollmentEnabled,
      totalStudents: updatedCourse.totalStudents,
      averageRating: updatedCourse.averageRating,
      createdAt: updatedCourse.createdAt,
      updatedAt: updatedCourse.updatedAt
    })
    
  } catch (error: any) {
    console.error('Error updating course:', error)
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Course with this title already exists' },
        { status: 400 }
      )
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message)
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

// DELETE - Delete course
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    console.log('DELETE /api/admin/youtube-courses/[courseId] called')
    
    const { courseId } = await params
    
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectToDatabase()

    const adminUser = await User.findOne({ clerkId: user.id })
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    let course: Course | null = null
    
    if (mongoose.isValidObjectId(courseId)) {
      course = await YouTubeCourse.findById(courseId) as Course | null
    }
    
    if (!course) {
      course = await YouTubeCourse.findOne({ slug: courseId }) as Course | null
    }
    
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    if (course.totalStudents > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete course with enrolled students',
          totalStudents: course.totalStudents
        },
        { status: 400 }
      )
    }

    await YouTubeCourse.findByIdAndDelete(course._id)

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully'
    })
    
  } catch (error: any) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}