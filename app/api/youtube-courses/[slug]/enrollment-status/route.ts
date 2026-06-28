import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import YouTubeCourse from '@/lib/models/YouTubeCourse'
import UserProgress from '@/lib/models/UserProgress'
import '@/lib/loadmodels'
import mongoose from 'mongoose'
import { isValidObjectId } from '@/lib/utils/objectId'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectToDatabase()

    const currentUserDoc = await User.findOne({ clerkId: user.id })
    if (!currentUserDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        { error: 'Course identifier is required' },
        { status: 400 }
      )
    }

    // Build query based on whether slug is ObjectId or regular slug
    let query: any = {}
    
    if (isValidObjectId(slug)) {
      query._id = new mongoose.Types.ObjectId(slug)
    } else {
      query.slug = slug
    }

    const course = await YouTubeCourse.findOne(query)

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Check manual enrollment
    const enrollment = course.manualEnrollments?.find(
      (enrollment: any) => 
        enrollment.user.toString() === currentUserDoc._id.toString()
    )

    // If course is free and manual enrollment is disabled
    if (course.isFree && !course.manualEnrollmentEnabled) {
      return NextResponse.json({
        enrolled: true,
        status: 'approved'
      })
    }

    // Return enrollment status
    if (enrollment) {
      return NextResponse.json({
        enrolled: enrollment.status === 'approved',
        status: enrollment.status
      })
    }

    // Check if user has progress (for legacy free courses)
    const progress = await UserProgress.findOne({
      courseId: course._id,
      userId: currentUserDoc._id
    })

    if (progress?.enrolled) {
      return NextResponse.json({
        enrolled: true,
        status: 'approved'
      })
    }

    return NextResponse.json({
      enrolled: false,
      status: null
    })
    
  } catch (error: any) {
    console.error('Error fetching enrollment status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}