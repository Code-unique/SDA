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
  previewVideo?: string;
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
    
    // Await the params Promise directly
    const { courseId } = await params
    
    if (!courseId || courseId.trim() === '') {
      console.log('Empty course ID received')
      return NextResponse.json(
        { error: 'Course identifier is required' },
        { status: 400 }
      )
    }
    
    console.log('Requested course ID:', courseId)

    const user = await currentUser()
    if (!user) {
      console.log('No user found - Unauthorized')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectToDatabase()
    console.log('Database connected')

    const adminUser = await User.findOne({ clerkId: user.id })
    if (!adminUser || adminUser.role !== 'admin') {
      console.log('User not admin or not found:', { clerkId: user.id, adminUser })
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Try multiple ways to find the course
    let course: Course | null = null
    
    // First try as ObjectId
    if (mongoose.isValidObjectId(courseId)) {
      console.log('Searching by ObjectId:', courseId)
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
    
    // If not found by ObjectId, try by slug
    if (!course) {
      console.log('Not found by ObjectId, trying by slug:', courseId)
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
      console.log('Course not found by any method')
      
      // Get all courses to help debug
      const allCourses = await YouTubeCourse.find({}, '_id title slug').lean() as unknown as Course[]
      console.log('Available courses:', allCourses.map(c => ({ 
        _id: c._id.toString(), 
        title: c.title, 
        slug: c.slug 
      })))
      
      return NextResponse.json(
        { 
          error: 'Course not found',
          requestedId: courseId,
          availableCount: allCourses.length,
          availableCourses: allCourses.slice(0, 5).map(c => ({
            _id: c._id.toString(),
            title: c.title,
            slug: c.slug
          }))
        },
        { status: 404 }
      )
    }

    console.log('Course found:', { 
      _id: course._id.toString(),
      title: course.title,
      slug: course.slug 
    })

    // Convert _id to string for consistent response
    const courseWithStringId = {
      ...course,
      _id: course._id.toString(),
      totalReviews: course.ratings?.length || 0
    }

    return NextResponse.json(courseWithStringId)
    
  } catch (error: any) {
    console.error('Error fetching course:', error)
    console.error('Error stack:', error.stack)
    
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}

// PUT - Update course
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

    console.log('Updating course ID/slug:', courseId)

    // Try multiple ways to find the course
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
    console.log('Update body received')
    
    // Validate updates
    const updates: any = {}

    // Update basic fields if provided
    if (body.title !== undefined) {
      if (body.title.trim().length === 0) {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        )
      }
      updates.title = body.title.substring(0, 100)
      
      // Generate new slug if title changed
      if (body.title !== course.title) {
        const newSlug = body.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 100)
        
        // Check if slug already exists for another course
        if (newSlug !== course.slug) {
          const existingCourse = await YouTubeCourse.findOne({ 
            slug: newSlug,
            _id: { $ne: course._id }
          })
          if (existingCourse) {
            return NextResponse.json(
              { error: 'Another course with this title already exists' },
              { status: 400 }
            )
          }
          updates.slug = newSlug
        }
      }
    }

    if (body.description !== undefined) {
      updates.description = body.description
    }

    if (body.shortDescription !== undefined) {
      updates.shortDescription = body.shortDescription.substring(0, 200)
    }

    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || body.price < 0) {
        return NextResponse.json(
          { error: 'Price must be a positive number' },
          { status: 400 }
        )
      }
      updates.price = body.isFree ? 0 : body.price
    }

    if (body.isFree !== undefined) {
      updates.isFree = !!body.isFree
      if (body.isFree) {
        updates.price = 0
      }
    }

    if (body.level !== undefined) {
      const validLevels = ['beginner', 'intermediate', 'advanced']
      if (!validLevels.includes(body.level)) {
        return NextResponse.json(
          { error: 'Invalid level' },
          { status: 400 }
        )
      }
      updates.level = body.level
    }

    if (body.category !== undefined) {
      updates.category = body.category ? body.category.substring(0, 50) : undefined
    }

    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags)) {
        return NextResponse.json(
          { error: 'Tags must be an array' },
          { status: 400 }
        )
      }
      updates.tags = body.tags.slice(0, 10).map((tag: string) => tag.substring(0, 30))
    }

    if (body.thumbnail !== undefined) {
      updates.thumbnail = body.thumbnail
    }

    if (body.previewVideo !== undefined) {
      updates.previewVideo = body.previewVideo
    }

    if (body.requirements !== undefined) {
      if (!Array.isArray(body.requirements)) {
        return NextResponse.json(
          { error: 'Requirements must be an array' },
          { status: 400 }
        )
      }
      updates.requirements = body.requirements.slice(0, 10).map((req: string) => req.substring(0, 200))
    }

    if (body.learningOutcomes !== undefined) {
      if (!Array.isArray(body.learningOutcomes)) {
        return NextResponse.json(
          { error: 'Learning outcomes must be an array' },
          { status: 400 }
        )
      }
      updates.learningOutcomes = body.learningOutcomes.slice(0, 10).map((lo: string) => lo.substring(0, 200))
    }

    if (body.isPublished !== undefined) {
      updates.isPublished = !!body.isPublished
    }

    if (body.isFeatured !== undefined) {
      updates.isFeatured = !!body.isFeatured
    }

    if (body.manualEnrollmentEnabled !== undefined) {
      updates.manualEnrollmentEnabled = body.manualEnrollmentEnabled !== false
    }

    // Update the course
    console.log('Applying updates:', updates)
    const updatedCourse = await YouTubeCourse.findByIdAndUpdate(
      course._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('instructor', 'username firstName lastName avatar') as Course

    if (!updatedCourse) {
      return NextResponse.json(
        { error: 'Failed to update course' },
        { status: 500 }
      )
    }

    console.log('Course updated successfully:', updatedCourse.title)

    return NextResponse.json({
      success: true,
      message: 'Course updated successfully',
      course: {
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
      }
    })
    
  } catch (error: any) {
    console.error('Error updating course:', error)
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Course with this title or slug already exists' },
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

    console.log('Deleting course ID/slug:', courseId)

    // Try multiple ways to find the course
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

    // Check if course has students enrolled
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

    console.log('Course deleted successfully:', course.title)

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