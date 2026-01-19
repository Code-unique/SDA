// app/api/courses/[id]/route.ts - UPDATED FOR LESSON AND SUBLESSON VIDEOS
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'
import mongoose from 'mongoose'
import "@/lib/loadmodels";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()

    // Await the params Promise
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Check if the ID is a valid MongoDB ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id)
    
    let course
    
    if (isValidObjectId) {
      course = await Course.findOne({
        $or: [
          { _id: new mongoose.Types.ObjectId(id) },
          { slug: id }
        ],
        isPublished: true
      })
      .populate('instructor', 'username firstName lastName avatar bio rating totalStudents')
      .populate('ratings.user', 'username firstName lastName avatar')
      .lean()
    } else {
      course = await Course.findOne({
        slug: id,
        isPublished: true
      })
      .populate('instructor', 'username firstName lastName avatar bio rating totalStudents')
      .populate('ratings.user', 'username firstName lastName avatar')
      .lean()
    }

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Get similar courses
    const similarCourses = await Course.find({
      _id: { $ne: course._id },
      category: course.category,
      isPublished: true
    })
      .populate('instructor', 'username firstName lastName avatar')
      .limit(4)
      .lean()

    // Calculate total reviews
    const totalReviews = course.ratings?.length || 0

    // UPDATED: Calculate total duration, lessons, and sub-lessons
    let totalDuration = 0
    let totalLessons = 0
    let totalSubLessons = 0
    
    if (course.modules) {
      course.modules.forEach((module: any) => {
        if (module.chapters) {
          module.chapters.forEach((chapter: any) => {
            if (chapter.lessons) {
              totalLessons += chapter.lessons.length
              chapter.lessons.forEach((lesson: any) => {
                // Add lesson duration
                totalDuration += lesson.duration || 0
                
                // Count and add sub-lessons
                if (lesson.subLessons) {
                  totalSubLessons += lesson.subLessons.length
                  lesson.subLessons.forEach((subLesson: any) => {
                    totalDuration += subLesson.duration || 0
                  })
                }
              })
            }
          })
        }
      })
    }

    const enhancedCourse = {
      ...course,
      totalDuration,
      totalLessons,
      totalSubLessons,
      totalReviews,
      aiFeatures: {
        hasAIAssistant: Math.random() > 0.7,
        hasPersonalizedLearning: Math.random() > 0.5,
        hasSmartRecommendations: Math.random() > 0.6,
        hasProgressTracking: true,
        hasPersonalizedFeedback: Math.random() > 0.8
      },
      completionRate: course.totalStudents > 0 
        ? Math.floor(Math.random() * 30) + 70
        : undefined,
      similarCourses: similarCourses.map((c: any) => ({
        ...c,
        totalReviews: c.ratings?.length || 0
      }))
    }

    return NextResponse.json(enhancedCourse)
  } catch (error: any) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}