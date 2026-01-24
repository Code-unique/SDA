// app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'
import mongoose from 'mongoose'
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
      originalUrl: s3Asset.url
    };
  }
  
  if (s3Asset.url && s3Asset.url.includes(CLOUDFRONT_DOMAIN)) {
    return s3Asset;
  }
  
  return s3Asset;
}

// Helper to process lessons with CloudFront URLs
function processLessonsWithCloudFront(lessons: any[]): any[] {
  if (!lessons || !Array.isArray(lessons)) return [];
  
  return lessons.map(lesson => {
    // Process main lesson video
    const video = convertToCloudFrontUrl(lesson.video || lesson.videoSource?.video);
    
    // Process sub-lessons
    const subLessons = lesson.subLessons?.map((subLesson: any) => ({
      ...subLesson,
      video: convertToCloudFrontUrl(subLesson.video || subLesson.videoSource?.video)
    })) || [];
    
    return {
      ...lesson,
      video,
      subLessons
    };
  });
}

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

    // Calculate total duration, lessons, and sub-lessons
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

    // Convert all video URLs to CloudFront
    const thumbnail = convertToCloudFrontUrl(course.thumbnail);
    const previewVideo = convertToCloudFrontUrl(course.previewVideo);
    
    // Process modules with CloudFront URLs
    const modules = course.modules?.map((module: any) => ({
      ...module,
      chapters: module.chapters?.map((chapter: any) => ({
        ...chapter,
        lessons: processLessonsWithCloudFront(chapter.lessons)
      })) || []
    })) || [];

    // Convert similar courses URLs
    const similarCoursesWithUrls = similarCourses.map((c: any) => ({
      ...c,
      _id: c._id.toString(),
      thumbnail: convertToCloudFrontUrl(c.thumbnail),
      previewVideo: convertToCloudFrontUrl(c.previewVideo),
      totalReviews: c.ratings?.length || 0
    }));

    const enhancedCourse = {
      ...course,
      _id: course._id.toString(),
      thumbnail,
      previewVideo,
      modules,
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
      similarCourses: similarCoursesWithUrls,
      // Add CloudFront domain for frontend reference
      cloudFrontDomain: CLOUDFRONT_DOMAIN
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