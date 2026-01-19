// app/api/courses/[id]/stream/route.ts - UPDATED FOR LESSON AND SUBLESSON VIDEOS
import { NextRequest } from 'next/server'
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

    const { id } = await params

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          // Check if the ID is a valid MongoDB ObjectId
          const isValidObjectId = mongoose.Types.ObjectId.isValid(id)
          
          let course
          
          if (isValidObjectId) {
            course = await Course.findOne({
              $or: [
                { _id: id },
                { slug: id }
              ],
              isPublished: true
            })
          } else {
            course = await Course.findOne({
              slug: id,
              isPublished: true
            })
          }

          if (!course) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                message: 'Course not found'
              })}\n\n`)
            )
            controller.close()
            return
          }

          // Get ratings separately
          const courseWithRatings = await Course.findById(course._id)
            .populate('ratings.user', 'username firstName lastName avatar')
            .lean()

          // Stream basic course info first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'basic',
              data: getBasicCourseInfo(course)
            })}\n\n`)
          )

          await new Promise(resolve => setTimeout(resolve, 100))

          // Stream instructor info
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'instructor',
              data: course.instructor
            })}\n\n`)
          )

          await new Promise(resolve => setTimeout(resolve, 100))

          // Stream modules (UPDATED: Now includes lessons with videos and sub-lessons)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'modules',
              data: course.modules || []
            })}\n\n`)
          )

          await new Promise(resolve => setTimeout(resolve, 100))

          // Stream ratings
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'ratings',
              data: courseWithRatings?.ratings || []
            })}\n\n`)
          )

          await new Promise(resolve => setTimeout(resolve, 100))

          // Stream AI features
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'aiFeatures',
              data: getAIFeatures(course)
            })}\n\n`)
          )

          await new Promise(resolve => setTimeout(resolve, 100))

          // Stream similar courses
          const similarCourses = await getSimilarCourses(course)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'similar',
              data: similarCourses
            })}\n\n`)
          )

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'complete',
              message: 'Course data streamed successfully'
            })}\n\n`)
          )

        } catch (error: any) {
          console.error('Error in stream:', error)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              message: error.message
            })}\n\n`)
          )
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error('Error in course stream route:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Streaming failed', 
        message: error.message 
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
  }
}

function getBasicCourseInfo(course: any) {
  // UPDATED: Calculate counts for the new structure with lesson videos
  let totalLessons = 0
  let totalSubLessons = 0
  let totalDuration = 0
  
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

  return {
    _id: course._id.toString(),
    title: course.title,
    description: course.description,
    shortDescription: course.shortDescription,
    slug: course.slug,
    price: course.price,
    isFree: course.isFree,
    level: course.level,
    category: course.category,
    tags: course.tags,
    thumbnail: course.thumbnail,
    previewVideo: course.previewVideo,
    totalStudents: course.totalStudents,
    averageRating: course.averageRating,
    totalReviews: course.ratings?.length || 0,
    totalDuration,
    totalLessons,
    totalSubLessons,
    isFeatured: course.isFeatured,
    requirements: course.requirements,
    learningOutcomes: course.learningOutcomes,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt
  }
}

function getAIFeatures(course: any) {
  return {
    hasAIAssistant: Math.random() > 0.7,
    hasPersonalizedLearning: Math.random() > 0.5,
    hasSmartRecommendations: Math.random() > 0.6,
    hasProgressTracking: true,
    hasPersonalizedFeedback: Math.random() > 0.8,
    estimatedCompletion: `${Math.floor(Math.random() * 4) + 2} weeks`,
    difficultyAdjustment: Math.random() > 0.5
  }
}

async function getSimilarCourses(currentCourse: any) {
  try {
    const similarCourses = await Course.find({
      _id: { $ne: currentCourse._id },
      category: currentCourse.category,
      isPublished: true
    })
      .populate('instructor', 'username firstName lastName avatar')
      .limit(4)
      .lean()

    return similarCourses.map(course => ({
      ...course,
      _id: course._id.toString(),
      totalReviews: course.ratings?.length || 0
    }))
  } catch (error) {
    console.error('Error fetching similar courses:', error)
    return []
  }
}