import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course from '@/lib/models/Course'

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
    const course = await Course.findById(id)
    
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const body = await request.json()
    const { rating, review } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Check if user is enrolled
    const isEnrolled = course.students.some(
      (student: any) => student.user.toString() === currentUserDoc._id.toString()
    )

    if (!isEnrolled) {
      return NextResponse.json({ error: 'You must be enrolled in the course to rate it' }, { status: 403 })
    }

    // Ensure ratings array exists
    if (!course.ratings) {
      course.ratings = []
    }

    // Check if already rated
    const existingRatingIndex = course.ratings.findIndex(
      (r: any) => r.user.toString() === currentUserDoc._id.toString()
    )

    if (existingRatingIndex > -1) {
      // Update existing rating
      course.ratings[existingRatingIndex].rating = rating
      course.ratings[existingRatingIndex].review = review
      course.ratings[existingRatingIndex].updatedAt = new Date()
    } else {
      // Add new rating
      course.ratings.push({
        user: currentUserDoc._id,
        rating,
        review,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    // Update average rating
    const totalRatings = course.ratings.length
    const sumRatings = course.ratings.reduce((sum: number, r: any) => sum + r.rating, 0)
    course.averageRating = Math.round((sumRatings / totalRatings) * 10) / 10

    await course.save()
    await course.populate('instructor', 'username firstName lastName avatar')
    await course.populate('ratings.user', 'username firstName lastName avatar')

    return NextResponse.json({
      success: true,
      course: {
        ...course.toObject(),
        totalReviews: course.ratings.length
      }
    })
  } catch (error: any) {
    console.error('Error rating course:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}