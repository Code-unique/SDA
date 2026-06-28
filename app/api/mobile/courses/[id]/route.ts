// app/api/mobile/courses/[id]/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'
import { mobileResponse, mobileError } from '@/lib/mobile-auth'
import mongoose from 'mongoose'
import "@/lib/loadmodels"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params
    
    if (!id) {
      return mobileError('Course ID is required', 400)
    }
    
    let course
    
    if (mongoose.Types.ObjectId.isValid(id)) {
      course = await Course.findById(id)
        .populate('instructor', 'username firstName lastName avatar bio rating totalStudents')
        .lean()
    } else {
      course = await Course.findOne({ slug: id })
        .populate('instructor', 'username firstName lastName avatar bio rating totalStudents')
        .lean()
    }
    
    if (!course) {
      return mobileError('Course not found', 404)
    }
    
    return mobileResponse({
      ...course,
      _id: course._id.toString(),
      instructor: course.instructor ? {
        ...course.instructor,
        _id: (course.instructor as any)._id.toString()
      } : null
    })
  } catch (error: any) {
    console.error('Mobile course detail error:', error)
    return mobileError('Failed to fetch course: ' + error.message, 500)
  }
}