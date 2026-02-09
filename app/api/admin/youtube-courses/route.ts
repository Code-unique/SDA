import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import YouTubeCourse from '@/lib/models/YouTubeCourse'
import { parseYouTubeUrl } from '@/lib/utils/youtubeParser'
import '@/lib/loadmodels'
import mongoose from 'mongoose'
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()

    // Validate required fields
    const requiredFields = ['title', 'description', 'shortDescription', 'thumbnail']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate slug
    const slug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100)

    // Check for existing course
    const existingCourse = await YouTubeCourse.findOne({
      $or: [
        { title: body.title },
        { slug }
      ]
    })

    if (existingCourse) {
      return NextResponse.json(
        { error: 'Course with this title already exists' },
        { status: 400 }
      )
    }

    // Create course data
    const courseData = {
      title: body.title.substring(0, 100),
      slug,
      description: body.description,
      shortDescription: body.shortDescription.substring(0, 200),
      instructor: adminUser._id,
      price: body.isFree ? 0 : (body.price || 0),
      isFree: !!body.isFree,
      level: body.level || 'beginner',
      category: body.category ? body.category.substring(0, 50) : undefined,
      tags: (body.tags || []).slice(0, 10).map((tag: string) => tag.substring(0, 30)),
      thumbnail: body.thumbnail,
      previewVideo: body.previewVideo,
      modules: body.modules || [],
      requirements: (body.requirements || []).slice(0, 10).map((req: string) => req.substring(0, 200)),
      learningOutcomes: (body.learningOutcomes || []).slice(0, 10).map((lo: string) => lo.substring(0, 200)),
      isPublished: !!body.isPublished,
      isFeatured: !!body.isFeatured,
      manualEnrollmentEnabled: body.manualEnrollmentEnabled !== false,
      totalStudents: 0,
      averageRating: 0,
      ratings: [],
      manualEnrollments: []
    }

    const course = await YouTubeCourse.create(courseData)
    await course.populate('instructor', 'username firstName lastName avatar')

    return NextResponse.json({
      _id: course._id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      shortDescription: course.shortDescription,
      instructor: course.instructor,
      price: course.price,
      isFree: course.isFree,
      level: course.level,
      category: course.category,
      tags: course.tags,
      thumbnail: course.thumbnail,
      previewVideo: course.previewVideo,
      modules: course.modules,
      requirements: course.requirements,
      learningOutcomes: course.learningOutcomes,
      isPublished: course.isPublished,
      isFeatured: course.isFeatured,
      manualEnrollmentEnabled: course.manualEnrollmentEnabled,
      totalStudents: course.totalStudents,
      averageRating: course.averageRating,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    })
    
  } catch (error: any) {
    console.error('Error creating YouTube course:', error)
    
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

// GET method for listing courses
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10')))
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    const skip = (page - 1) * limit

    let query: any = {}

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } }
      ]
    }

    if (status !== 'all') {
      if (status === 'published') query.isPublished = true
      else if (status === 'draft') query.isPublished = false
      else if (status === 'featured') query.isFeatured = true
    }

    const [courses, total] = await Promise.all([
      YouTubeCourse.find(query)
        .populate('instructor', 'username firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      YouTubeCourse.countDocuments(query)
    ])

    return NextResponse.json({
      courses: courses.map(course => ({
        ...course,
        totalReviews: course.ratings?.length || 0,
        _id: (course._id as mongoose.Types.ObjectId).toString()
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching YouTube courses:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}