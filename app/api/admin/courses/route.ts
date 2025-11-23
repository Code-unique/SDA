import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course, { ICloudinaryAsset } from '@/lib/models/Course'

export async function POST(request: NextRequest) {
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
      isFeatured
    } = body

    // Validate required fields
    if (!title || !description || !shortDescription || !level || !category || !thumbnail) {
      return NextResponse.json(
        { error: 'Missing required fields' }, 
        { status: 400 }
      )
    }

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

    // Check for existing course
    const existingCourse = await Course.findOne({ 
      $or: [
        { title },
        { slug }
      ]
    })

    if (existingCourse) {
      return NextResponse.json(
        { error: 'Course with this title already exists' }, 
        { status: 400 }
      )
    }

    // Transform modules data to match schema
    const transformedModules = modules?.map((module: any, index: number) => ({
      title: module.title,
      description: module.description,
      order: module.order !== undefined ? module.order : index,
      lessons: module.lessons?.map((lesson: any, lessonIndex: number) => ({
        title: lesson.title,
        description: lesson.description,
        content: lesson.content || '',
        video: lesson.video, // Should be ICloudinaryAsset
        duration: lesson.duration || 0,
        isPreview: lesson.isPreview || false,
        resources: lesson.resources || [],
        order: lesson.order !== undefined ? lesson.order : lessonIndex
      })) || []
    })) || []

    // Create course with proper schema structure
    const courseData = {
      title,
      slug,
      description,
      shortDescription,
      price: isFree ? 0 : (price || 0),
      isFree: !!isFree,
      level,
      category,
      tags: tags || [],
      thumbnail: thumbnail as ICloudinaryAsset,
      previewVideo: previewVideo as ICloudinaryAsset | undefined,
      modules: transformedModules,
      instructor: adminUser._id,
      requirements: requirements || [],
      learningOutcomes: learningOutcomes || [],
      isPublished: false,
      isFeatured: !!isFeatured,
      // These will be auto-calculated by the schema pre-save hook
      totalStudents: 0,
      averageRating: 0,
      totalDuration: 0,
      totalLessons: 0
    }

    const course = await Course.create(courseData)
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
      totalStudents: course.totalStudents,
      averageRating: course.averageRating,
      totalDuration: course.totalDuration,
      totalLessons: course.totalLessons,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    })
  } catch (error: any) {
    console.error('Error creating course:', error)
    
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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    const skip = (page - 1) * limit

    let query: any = {}
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ]
    }

    if (status !== 'all') {
      if (status === 'published') query.isPublished = true
      else if (status === 'draft') query.isPublished = false
      else if (status === 'featured') query.isFeatured = true
    }

    const courses = await Course.find(query)
      .populate('instructor', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Course.countDocuments(query)

    return NextResponse.json({
      courses: courses.map(course => ({
        ...course,
        totalReviews: course.ratings?.length || 0
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
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message }, 
      { status: 500 }
    )
  }
}