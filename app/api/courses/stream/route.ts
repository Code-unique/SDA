// app/api/courses/stream/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'popular'
    const category = searchParams.get('category') || ''
    const level = searchParams.get('level') || ''
    const price = searchParams.get('price') || 'all'
    const rating = parseInt(searchParams.get('rating') || '0')

    const skip = (page - 1) * limit

    // Build query
    let query: any = { isPublished: true }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { 'instructor.username': { $regex: search, $options: 'i' } },
        { 'instructor.firstName': { $regex: search, $options: 'i' } },
        { 'instructor.lastName': { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ]
    }

    // Category filter
    if (category) {
      query.category = category
    }

    // Level filter
    if (level) {
      query.level = level
    }

    // Price filter
    if (price === 'free') {
      query.isFree = true
    } else if (price === 'paid') {
      query.isFree = false
    }

    // Rating filter
    if (rating > 0) {
      query.averageRating = { $gte: rating }
    }

    // Sort options
    let sortOptions: any = {}
    switch (sort) {
      case 'newest':
        sortOptions = { createdAt: -1 }
        break
      case 'rating':
        sortOptions = { averageRating: -1 }
        break
      case 'duration':
        sortOptions = { totalDuration: -1 }
        break
      case 'price-low':
        sortOptions = { price: 1 }
        break
      case 'price-high':
        sortOptions = { price: -1 }
        break
      case 'popular':
      default:
        sortOptions = { totalStudents: -1 }
        break
    }

    // Get total counts for stats
    const totalCourses = await Course.countDocuments({ isPublished: true })
    const featuredCourses = await Course.countDocuments({ isPublished: true, isFeatured: true })
    const freeCourses = await Course.countDocuments({ isPublished: true, isFree: true })
    const totalEnrollments = await Course.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: null, total: { $sum: '$totalStudents' } } }
    ])

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        try {
          // Send stats first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'stats',
              stats: {
                totalCourses,
                featuredCourses,
                freeCourses,
                totalEnrollments: totalEnrollments[0]?.total || 0
              }
            })}\n\n`)
          )

          // Get courses with streaming
          const courses = await Course.find(query)
            .populate('instructor', 'username firstName lastName avatar bio rating totalStudents')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean()

          // Stream courses one by one with delay for visual effect
          for (let i = 0; i < courses.length; i++) {
            const course = courses[i]
            
            // Add AI features flag for demonstration
            const enhancedCourse = {
              ...course,
              aiFeatures: {
                hasAIAssistant: Math.random() > 0.7,
                hasPersonalizedLearning: Math.random() > 0.5,
                hasSmartRecommendations: Math.random() > 0.6
              },
              completionRate: course.totalStudents > 0 
                ? Math.floor(Math.random() * 30) + 70 // 70-100% completion rate
                : undefined
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'course',
                course: enhancedCourse
              })}\n\n`)
            )

            // Small delay for streaming effect (remove in production)
            if (process.env.NODE_ENV === 'development') {
              await new Promise(resolve => setTimeout(resolve, 50))
            }
          }

          // Send AI recommendations (mock data for now)
          if (page === 1) {
            const recommendedCourses = await Course.find({ 
              isPublished: true,
              isFeatured: true 
            })
              .populate('instructor', 'username firstName lastName avatar')
              .limit(3)
              .lean()

            for (const course of recommendedCourses) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'recommendation',
                  course: {
                    ...course,
                    aiFeatures: { hasAIAssistant: true, hasPersonalizedLearning: true, hasSmartRecommendations: true }
                  }
                })}\n\n`)
              )
            }
          }

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'complete',
              message: 'All courses streamed successfully'
            })}\n\n`)
          )

        } catch (error: any) {
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })

  } catch (error: any) {
    console.error('Error in courses stream:', error)
    
    // Fallback to regular response if streaming fails
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