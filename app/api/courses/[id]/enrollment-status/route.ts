import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course from '@/lib/models/Course'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ isEnrolled: false })
    }

    await connectToDatabase()
    
    const currentUserDoc = await User.findOne({ clerkId: user.id })
    if (!currentUserDoc) {
      return NextResponse.json({ isEnrolled: false })
    }

    const { id } = await params

    // Check if the ID is a valid MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id)
    
    let course
    
    if (isValidObjectId) {
      course = await Course.findById(id)
    } else {
      course = await Course.findOne({ slug: id })
    }

    if (!course) {
      return NextResponse.json({ isEnrolled: false })
    }

    const isEnrolled = course.students.some(
      (student: any) => student.user.toString() === currentUserDoc._id.toString()
    )

    return NextResponse.json({ 
      isEnrolled,
      courseId: course._id 
    })

  } catch (error) {
    console.error('Error checking enrollment status:', error)
    return NextResponse.json({ isEnrolled: false })
  }
}