// app/api/courses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import "@/lib/loadmodels";

// CloudFront domain
const CLOUDFRONT_DOMAIN = 'd2c1y2391adh81.cloudfront.net';

// Helper to convert S3 URLs to CloudFront URLs
function convertToCloudFrontUrl(s3Asset: any): any {
  if (!s3Asset) return undefined;
  
  if (s3Asset.key && s3Asset.key.startsWith('courses/')) {
    return {
      ...s3Asset,
      url: `https://${CLOUDFRONT_DOMAIN}/${s3Asset.key}`,
      originalUrl: s3Asset.url // Keep original for reference
    };
  }
  
  // If it's already a CloudFront URL, keep it
  if (s3Asset.url && s3Asset.url.includes(CLOUDFRONT_DOMAIN)) {
    return s3Asset;
  }
  
  return s3Asset;
}

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

    if (search) {
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
        { shortDescription: { $regex: sanitizedSearch, $options: 'i' } },
        { 'instructor.username': { $regex: sanitizedSearch, $options: 'i' } },
        { category: { $regex: sanitizedSearch, $options: 'i' } }
      ];
    }

    if (category) query.category = category.substring(0, 50);
    if (level && ['beginner', 'intermediate', 'advanced'].includes(level)) query.level = level;
    if (price === 'free') query.isFree = true;
    if (price === 'paid') query.isFree = false;
    if (rating > 0 && rating <= 5) query.averageRating = { $gte: rating };

    // Sort options
    let sortOptions: any = {};
    switch (sort) {
      case 'newest': sortOptions = { createdAt: -1 }; break;
      case 'rating': sortOptions = { averageRating: -1 }; break;
      case 'duration': sortOptions = { totalDuration: -1 }; break;
      case 'price-low': sortOptions = { price: 1 }; break;
      case 'price-high': sortOptions = { price: -1 }; break;
      default: sortOptions = { totalStudents: -1 }; break;
    }

    const [courses, totalCourses, featuredCourses, freeCourses, totalEnrollmentsResult] = await Promise.all([
      Course.find(query)
        .populate('instructor', 'username firstName lastName avatar bio rating totalStudents')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments({ isPublished: true }),
      Course.countDocuments({ isPublished: true, isFeatured: true }),
      Course.countDocuments({ isPublished: true, isFree: true }),
      Course.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: null, total: { $sum: '$totalStudents' } } }
      ])
    ]);

    // Enhance courses with CloudFront URLs
    const enhancedCourses = courses.map(course => {
      // Convert thumbnail URL to CloudFront
      const thumbnail = convertToCloudFrontUrl(course.thumbnail);
      
      // Convert preview video URL to CloudFront
      const previewVideo = convertToCloudFrontUrl(course.previewVideo);
      
      return {
        ...course,
        _id: course._id.toString(),
        thumbnail,
        previewVideo,
        aiFeatures: {
          hasAIAssistant: Math.random() > 0.7,
          hasPersonalizedLearning: Math.random() > 0.5,
          hasSmartRecommendations: Math.random() > 0.6
        },
        completionRate: course.totalStudents > 0
          ? Math.floor(Math.random() * 30) + 70
          : undefined
      };
    });

    const totalEnrollments = totalEnrollmentsResult[0]?.total || 0;

    return NextResponse.json({
      courses: enhancedCourses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCourses / limit),
        total: totalCourses,
        hasNext: page < Math.ceil(totalCourses / limit),
        hasPrev: page > 1
      },
      stats: {
        totalCourses,
        featuredCourses,
        freeCourses,
        totalEnrollments
      }
    });

  } catch (error: any) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}