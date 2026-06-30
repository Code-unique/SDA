// app/api/mobile/courses/[id]/stream/route.ts - FIXED
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Course from '@/lib/models/Course'
import UserProgress from '@/lib/models/UserProgress'
import { mobileSuccess, mobileError } from '@/lib/mobile/responses'
import { moderateRateLimit } from '@/lib/mobile/rate-limit'
import { authenticateMobileRequest } from '@/lib/mobile/auth'
import mongoose from 'mongoose'
import "@/lib/loadmodels"

// CloudFront domain
const CLOUDFRONT_DOMAIN = 'd2c1y2391adh81.cloudfront.net'

// Helper to convert S3 URLs to CloudFront URLs
function convertToCloudFrontUrl(s3Asset: any): any {
  if (!s3Asset) return undefined
  
  if (s3Asset.key && s3Asset.key.startsWith('courses/')) {
    return {
      ...s3Asset,
      url: `https://${CLOUDFRONT_DOMAIN}/${s3Asset.key}`,
      originalUrl: s3Asset.url
    }
  }
  
  if (s3Asset.url && s3Asset.url.includes(CLOUDFRONT_DOMAIN)) {
    return s3Asset
  }
  
  return s3Asset
}

// Helper to process lessons with CloudFront URLs
function processLessonsWithCloudFront(lessons: any[]): any[] {
  if (!lessons || !Array.isArray(lessons)) return []
  
  return lessons.map((lesson: any) => {
    const video = convertToCloudFrontUrl(lesson.video || lesson.videoSource?.video)
    
    const subLessons = lesson.subLessons?.map((subLesson: any) => ({
      ...subLesson,
      video: convertToCloudFrontUrl(subLesson.video || subLesson.videoSource?.video)
    })) || []
    
    return {
      ...lesson,
      video,
      subLessons
    }
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    await connectToDatabase()

    const { id } = await params

    if (!id) {
      return mobileError('Course ID is required', 400)
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
      .populate('instructor', 'username firstName lastName avatar bio rating totalStudents expertise')
      .populate('ratings.user', 'username firstName lastName avatar')
      .lean()
    } else {
      course = await Course.findOne({
        slug: id,
        isPublished: true
      })
      .populate('instructor', 'username firstName lastName avatar bio rating totalStudents expertise')
      .populate('ratings.user', 'username firstName lastName avatar')
      .lean()
    }

    if (!course) {
      return mobileError('Course not found', 404)
    }

    // Get auth for enrollment status and progress
    const authResult = await authenticateMobileRequest(request)
    const isAuthenticated = authResult.success

    let isEnrolled = false
    let userProgress = null

    if (isAuthenticated) {
      isEnrolled = course.students?.some(
        (s: any) => s.user.toString() === authResult.user._id.toString()
      ) || false

      if (isEnrolled) {
        const progress = await UserProgress.findOne({
          courseId: course._id,
          userId: authResult.user._id
        }).lean()
        userProgress = progress as any
      }
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
                totalDuration += lesson.duration || 0
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
    const thumbnail = convertToCloudFrontUrl(course.thumbnail)
    const previewVideo = convertToCloudFrontUrl(course.previewVideo)
    
    // Process modules with CloudFront URLs
    const modules = course.modules?.map((module: any) => ({
      ...module,
      chapters: module.chapters?.map((chapter: any) => ({
        ...chapter,
        lessons: processLessonsWithCloudFront(chapter.lessons)
      })) || []
    })) || []

    // Convert similar courses URLs
    const similarCoursesWithUrls = similarCourses.map((c: any) => ({
      ...c,
      _id: c._id.toString(),
      thumbnail: convertToCloudFrontUrl(c.thumbnail),
      previewVideo: convertToCloudFrontUrl(c.previewVideo),
      totalReviews: c.ratings?.length || 0
    }))

    // Handle instructor properly (it's already populated from .lean())
    const instructor = course.instructor as any

    const responseData = {
      _id: course._id.toString(),
      title: course.title,
      description: course.description,
      shortDescription: course.shortDescription,
      slug: course.slug,
      price: course.price,
      isFree: course.isFree,
      level: course.level,
      category: course.category,
      tags: course.tags || [],
      thumbnail,
      previewVideo,
      requirements: course.requirements || [],
      learningOutcomes: course.learningOutcomes || [],
      instructor: instructor ? {
        _id: instructor._id.toString(),
        username: instructor.username || '',
        firstName: instructor.firstName || '',
        lastName: instructor.lastName || '',
        avatar: instructor.avatar || '',
        bio: instructor.bio || '',
        rating: instructor.rating || 0,
        totalStudents: instructor.totalStudents || 0,
        expertise: instructor.expertise || []
      } : null,
      modules,
      ratings: course.ratings?.map((r: any) => ({
        _id: r._id?.toString(),
        rating: r.rating,
        review: r.review,
        user: r.user ? {
          _id: r.user._id.toString(),
          username: r.user.username,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          avatar: r.user.avatar
        } : null,
        createdAt: r.createdAt
      })) || [],
      totalStudents: course.totalStudents || 0,
      averageRating: course.averageRating || 0,
      totalReviews,
      totalDuration,
      totalLessons,
      totalSubLessons,
      isEnrolled,
      progress: userProgress ? {
        progress: userProgress.progress || 0,
        completed: userProgress.completed || false,
        lastAccessed: userProgress.lastAccessed,
        completedLessons: userProgress.completedLessons?.length || 0
      } : null,
      isFeatured: course.isFeatured || false,
      completionRate: course.totalStudents > 0 
        ? Math.floor(Math.random() * 30) + 70
        : undefined,
      similarCourses: similarCoursesWithUrls,
      cloudFrontDomain: CLOUDFRONT_DOMAIN,
      manualEnrollments: course.manualEnrollments || 0,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt
    }

    return mobileSuccess(responseData)

  } catch (error: any) {
    console.error('Error in course stream:', error)
    return mobileError(error.message || 'Failed to stream course', 500)
  }
}