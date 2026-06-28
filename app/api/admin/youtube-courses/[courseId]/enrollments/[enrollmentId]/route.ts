import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import YouTubeCourse from '@/lib/models/YouTubeCourse'
import UserProgress from '@/lib/models/UserProgress'
import '@/lib/loadmodels'
import mongoose from 'mongoose'

// Helper to extract params safely
async function getParams(params: Promise<{ courseId: string; enrollmentId: string }>): Promise<{ courseId: string; enrollmentId: string }> {
  try {
    return await params
  } catch (error) {
    console.error('Error getting params:', error)
    return { courseId: '', enrollmentId: '' }
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ courseId: string; enrollmentId: string }> }
) {
  try {
    console.log('PATCH /api/admin/youtube-courses/[courseId]/enrollments/[enrollmentId] called')
    
    // Extract params safely
    const { courseId, enrollmentId } = await getParams(context.params)
    
    console.log('PATCH Request:', { courseId, enrollmentId })
    
    if (!courseId || courseId.trim() === '') {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }
    
    if (!enrollmentId || enrollmentId.trim() === '') {
      return NextResponse.json(
        { error: 'Enrollment ID is required' },
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

    // Validate if IDs are valid MongoDB ObjectIds
    if (!mongoose.isValidObjectId(courseId)) {
      console.error('Invalid courseId:', courseId)
      return NextResponse.json(
        { error: 'Invalid course ID format' },
        { status: 400 }
      )
    }
    
    if (!mongoose.isValidObjectId(enrollmentId)) {
      console.error('Invalid enrollmentId:', enrollmentId)
      return NextResponse.json(
        { error: 'Invalid enrollment ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log('Request Body:', body)
    
    const { status, notes } = body

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be either "approved" or "rejected"' },
        { status: 400 }
      )
    }

    // Find the course
    const course = await YouTubeCourse.findById(courseId)
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    console.log('Course found:', course.title)
    console.log('Manual enrollments:', course.manualEnrollments?.length)

    // Find the enrollment in the course's manualEnrollments array
    const enrollment = course.manualEnrollments?.find(
      (e: any) => e._id.toString() === enrollmentId
    )

    if (!enrollment) {
      console.error('Enrollment not found in course.')
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      )
    }

    console.log('Enrollment found:', {
      id: enrollment._id.toString(),
      user: enrollment.user?.toString(),
      currentStatus: enrollment.status
    })

    // Check if enrollment is already processed
    if (enrollment.status !== 'pending') {
      return NextResponse.json(
        { error: `Enrollment is already ${enrollment.status}` },
        { status: 400 }
      )
    }

    // Update enrollment
    enrollment.status = status
    enrollment.approvedBy = adminUser._id
    enrollment.approvedAt = new Date()
    
    if (notes !== undefined && notes !== null) {
      enrollment.notes = notes
    }

    console.log('Updating enrollment to:', status)

    // If approved, create user progress and update student count
    if (status === 'approved') {
      console.log('Approving enrollment for user:', enrollment.user)
      
      // Check if progress already exists
      const existingProgress = await UserProgress.findOne({
        courseId: course._id,
        userId: enrollment.user
      })

      console.log('Existing progress:', existingProgress)

      if (!existingProgress) {
        console.log('Creating new user progress')
        await UserProgress.create({
          courseId: course._id,
          userId: enrollment.user,
          enrolled: true,
          progress: 0,
          completed: false,
          completedLessons: [],
          currentLesson: null,
          timeSpent: 0,
          lastAccessed: new Date()
        })

        // Increment total students
        course.totalStudents = (course.totalStudents || 0) + 1
        console.log('Updated total students:', course.totalStudents)
      } else {
        console.log('User already has progress, marking as enrolled')
        existingProgress.enrolled = true
        await existingProgress.save()
      }
    }

    // Mark the course as modified and save
    course.markModified('manualEnrollments')
    await course.save()

    console.log('Course saved successfully')

    // Populate for response
    const updatedCourse = await YouTubeCourse.findById(courseId)
      .populate({
        path: 'manualEnrollments.user',
        select: 'username firstName lastName email avatar'
      })
      .populate({
        path: 'manualEnrollments.approvedBy',
        select: 'username firstName lastName'
      })

    if (!updatedCourse) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated enrollment' },
        { status: 500 }
      )
    }

    const updatedEnrollment = updatedCourse.manualEnrollments.find(
      (e: any) => e._id.toString() === enrollmentId
    )

    if (!updatedEnrollment) {
      return NextResponse.json(
        { error: 'Failed to find updated enrollment' },
        { status: 500 }
      )
    }

    const responseData = {
      success: true,
      message: `Enrollment ${status} successfully`,
      enrollment: {
        _id: updatedEnrollment._id,
        user: {
          _id: updatedEnrollment.user?._id || updatedEnrollment.user,
          username: updatedEnrollment.user?.username || 'Unknown',
          firstName: updatedEnrollment.user?.firstName || 'Unknown',
          lastName: updatedEnrollment.user?.lastName || 'User',
          email: updatedEnrollment.user?.email || 'No email',
          avatar: updatedEnrollment.user?.avatar
        },
        status: updatedEnrollment.status,
        approvedBy: updatedEnrollment.approvedBy ? {
          _id: updatedEnrollment.approvedBy._id,
          username: updatedEnrollment.approvedBy.username,
          firstName: updatedEnrollment.approvedBy.firstName,
          lastName: updatedEnrollment.approvedBy.lastName
        } : null,
        approvedAt: updatedEnrollment.approvedAt,
        notes: updatedEnrollment.notes,
        createdAt: updatedEnrollment.createdAt,
        updatedAt: updatedEnrollment.updatedAt
      }
    }

    console.log('Sending response:', responseData)
    return NextResponse.json(responseData)
    
  } catch (error: any) {
    console.error('Error updating enrollment:', error)
    console.error('Error stack:', error.stack)
    
    if (error.name === 'CastError') {
      return NextResponse.json(
        { error: 'Invalid ID format: ' + error.message },
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