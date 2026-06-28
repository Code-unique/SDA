import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import YouTubeCourse from '@/lib/models/YouTubeCourse'
import mongoose from 'mongoose'
import '@/lib/loadmodels'

// Helper to extract params safely
async function getParams(params: Promise<{ courseId: string }>): Promise<{ courseId: string }> {
  try {
    return await params
  } catch (error) {
    console.error('Error getting params:', error)
    return { courseId: '' }
  }
}

// Define interface for enrollment
interface ManualEnrollment {
  _id: mongoose.Types.ObjectId;
  user: any;
  status: string;
  paymentMethod?: string;
  transactionId?: string;
  paymentProof?: string;
  notes?: string;
  approvedBy?: any;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Define interface for course
interface Course {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  price: number;
  isFree: boolean;
  manualEnrollmentEnabled: boolean;
  manualEnrollments?: ManualEnrollment[];
  ratings?: any[];
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    console.log('GET /api/admin/youtube-courses/[courseId]/enrollments called')
    
    // Extract params safely
    const { courseId } = await getParams(context.params)
    
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

    // Build query - try both ObjectId and slug
    let query: any = {}
    
    // First try as ObjectId
    if (mongoose.isValidObjectId(courseId)) {
      query._id = new mongoose.Types.ObjectId(courseId)
    } else {
      // If not valid ObjectId, try as slug
      query.slug = courseId
    }

    // Find course with populated enrollments
    const course = await YouTubeCourse.findOne(query)
      .populate({
        path: 'manualEnrollments.user',
        select: 'username firstName lastName email avatar'
      })
      .populate({
        path: 'manualEnrollments.approvedBy',
        select: 'username firstName lastName'
      })
      .lean() as Course | null

    if (!course) {
      console.log('Course not found with query:', query)
      return NextResponse.json(
        { 
          error: 'Course not found',
          requestedId: courseId
        },
        { status: 404 }
      )
    }

    // Get all enrollments
    const enrollments = course.manualEnrollments || []
    console.log('Found', enrollments.length, 'enrollments for course:', course.title)

    return NextResponse.json({
      course: {
        _id: course._id.toString(),
        title: course.title,
        price: course.price,
        isFree: course.isFree,
        manualEnrollmentEnabled: course.manualEnrollmentEnabled,
        slug: course.slug
      },
      enrollments: enrollments.map((enrollment: ManualEnrollment) => ({
        _id: enrollment._id.toString(),
        user: enrollment.user,
        status: enrollment.status,
        paymentMethod: enrollment.paymentMethod,
        transactionId: enrollment.transactionId,
        paymentProof: enrollment.paymentProof,
        notes: enrollment.notes,
        approvedBy: enrollment.approvedBy,
        approvedAt: enrollment.approvedAt,
        createdAt: enrollment.createdAt,
        updatedAt: enrollment.updatedAt
      }))
    })

  } catch (error: any) {
    console.error('Error fetching course enrollments:', error)
    
    if (error.name === 'CastError') {
      return NextResponse.json(
        { error: 'Invalid course ID format' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}