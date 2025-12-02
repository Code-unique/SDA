// app/api/courses/stream/route.ts
import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '12')));
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'popular';
    const category = searchParams.get('category') || '';
    const level = searchParams.get('level') || '';
    const price = searchParams.get('price') || 'all';
    const rating = parseInt(searchParams.get('rating') || '0');

    const skip = (page - 1) * limit;

    // Build query
    let query: any = { isPublished: true };

    // Sanitize search input
    const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { shortDescription: { $regex: sanitizedSearch, $options: 'i' } },
        { 'instructor.username': { $regex: sanitizedSearch, $options: 'i' } },
        { 'instructor.firstName': { $regex: sanitizedSearch, $options: 'i' } },
        { 'instructor.lastName': { $regex: sanitizedSearch, $options: 'i' } },
        { category: { $regex: sanitizedSearch, $options: 'i' } },
        { tags: { $in: [new RegExp(sanitizedSearch, 'i')] } }
      ];
    }

    // Category filter
    if (category) {
      query.category = category.substring(0, 50);
    }

    // Level filter
    if (level && ['beginner', 'intermediate', 'advanced'].includes(level)) {
      query.level = level;
    }

    // Price filter
    if (price === 'free') {
      query.isFree = true;
    } else if (price === 'paid') {
      query.isFree = false;
    }

    // Rating filter
    if (rating > 0 && rating <= 5) {
      query.averageRating = { $gte: rating };
    }

    // Sort options
    let sortOptions: any = {};
    switch (sort) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'rating':
        sortOptions = { averageRating: -1 };
        break;
      case 'duration':
        sortOptions = { totalDuration: -1 };
        break;
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'popular':
      default:
        sortOptions = { totalStudents: -1 };
        break;
    }

    // Get total counts for stats
    const [totalCourses, featuredCourses, freeCourses, totalEnrollmentsResult] = await Promise.all([
      Course.countDocuments({ isPublished: true }),
      Course.countDocuments({ isPublished: true, isFeatured: true }),
      Course.countDocuments({ isPublished: true, isFree: true }),
      Course.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: null, total: { $sum: '$totalStudents' } } }
      ])
    ]);

    const totalEnrollments = totalEnrollmentsResult[0]?.total || 0;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Send stats first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'stats',
              stats: {
                totalCourses,
                featuredCourses,
                freeCourses,
                totalEnrollments
              }
            })}\n\n`)
          );

          // Get courses with streaming
          const courses = await Course.find(query)
            .populate('instructor', 'username firstName lastName avatar bio rating totalStudents')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean();

          // Stream courses one by one with delay for visual effect
          for (let i = 0; i < courses.length; i++) {
            const course = courses[i];

            // Add AI features flag for demonstration
            const enhancedCourse = {
              ...course,
              _id: course._id.toString(),
              aiFeatures: {
                hasAIAssistant: Math.random() > 0.7,
                hasPersonalizedLearning: Math.random() > 0.5,
                hasSmartRecommendations: Math.random() > 0.6
              },
              completionRate: course.totalStudents > 0
                ? Math.floor(Math.random() * 30) + 70 // 70-100% completion rate
                : undefined
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'course',
                course: enhancedCourse
              })}\n\n`)
            );

            // Small delay for streaming effect (remove in production)
            if (process.env.NODE_ENV === 'development') {
              await new Promise(resolve => setTimeout(resolve, 50));
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
              .lean();

            for (const course of recommendedCourses) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'recommendation',
                  course: {
                    ...course,
                    _id: course._id.toString(),
                    aiFeatures: {
                      hasAIAssistant: true,
                      hasPersonalizedLearning: true,
                      hasSmartRecommendations: true
                    }
                  }
                })}\n\n`)
              );
            }
          }

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'complete',
              message: 'All courses streamed successfully'
            })}\n\n`)
          );

        } catch (error: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              message: error.message
            })}\n\n`)
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'X-Accel-Buffering': 'no'
      },
    });

  } catch (error: any) {
    console.error('Error in courses stream:', error);

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
    );
  }
}