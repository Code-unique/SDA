// lib/mobile/responses.ts
import { NextResponse } from 'next/server'
import { Types } from 'mongoose'

export interface MobileResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  code?: string
  timestamp: string
}

export interface MobilePaginatedResponse<T> extends MobileResponse<T> {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasMore: boolean
  }
}

/**
 * Success response for mobile APIs
 */
export function mobileSuccess<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<MobileResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

/**
 * Paginated success response
 */
export function mobilePaginated<T>(
  data: T,
  pagination: {
    page: number
    limit: number
    total: number
  },
  message?: string
): NextResponse<MobilePaginatedResponse<T>> {
  const { page, limit, total } = pagination
  const pages = Math.ceil(total / limit)

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasMore: page < pages,
    },
    message,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Error response for mobile APIs
 */
export function mobileError(
  error: string,
  status: number = 400,
  code?: string
): NextResponse<MobileResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      code: code || 'ERROR',
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

/**
 * Validation error helper
 */
export function mobileValidationError(errors: Record<string, string[]>): NextResponse<MobileResponse> {
  return NextResponse.json(
    {
      success: false,
      error: 'Validation failed',
      data: { errors },
      timestamp: new Date().toISOString(),
    },
    { status: 400 }
  )
}

// ============================================================
// SERIALIZERS
// ============================================================

/**
 * Serialize a MongoDB document to JSON
 */
export function serializeDoc<T extends { _id: Types.ObjectId, toObject?: () => any }>(doc: T): any {
  if (!doc) return null
  const obj = doc.toObject ? doc.toObject() : { ...doc }
  return serializeObject(obj)
}

/**
 * Serialize an object, converting ObjectIds and Dates
 */
export function serializeObject(obj: any): any {
  if (!obj) return obj
  if (Array.isArray(obj)) {
    return obj.map(item => serializeObject(item))
  }
  if (obj && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_id' && value instanceof Types.ObjectId) {
        result[key] = value.toString()
      } else if (value instanceof Types.ObjectId) {
        result[key] = value.toString()
      } else if (value instanceof Date) {
        result[key] = value.toISOString()
      } else if (Array.isArray(value)) {
        result[key] = serializeObject(value)
      } else if (value && typeof value === 'object') {
        result[key] = serializeObject(value)
      } else {
        result[key] = value
      }
    }
    return result
  }
  return obj
}

/**
 * Serialize a user for API response
 */
export function serializeUser(user: any) {
  if (!user) return null
  
  const obj = serializeObject(user)
  
  return {
    ...obj,
    followersCount: user.followers?.length || 0,
    followingCount: user.following?.length || 0,
  }
}

/**
 * Serialize a post for API response
 */
export function serializePost(post: any) {
  if (!post) return null
  
  const obj = serializeObject(post)
  
  return {
    ...obj,
    likesCount: post.likes?.length || 0,
    commentsCount: post.comments?.length || 0,
    savesCount: post.saves?.length || 0,
  }
}

/**
 * Serialize a course for API response
 */
export function serializeCourse(course: any) {
  if (!course) return null
  
  const obj = serializeObject(course)
  
  let totalLessons = 0
  let totalDuration = 0
  
  if (course.modules) {
    course.modules.forEach((module: any) => {
      if (module.chapters) {
        module.chapters.forEach((chapter: any) => {
          if (chapter.lessons) {
            totalLessons += chapter.lessons.length
            chapter.lessons.forEach((lesson: any) => {
              totalDuration += lesson.duration || 0
              if (lesson.subLessons) {
                lesson.subLessons.forEach((sub: any) => {
                  totalDuration += sub.duration || 0
                })
              }
            })
          }
        })
      }
    })
  }
  
  return {
    ...obj,
    totalLessons,
    totalDuration,
    totalReviews: course.ratings?.length || 0,
  }
}

/**
 * Serialize a comment for API response
 */
export function serializeComment(comment: any, currentUserId?: string) {
  if (!comment) return null
  
  const obj = serializeObject(comment)
  
  return {
    ...obj,
    likesCount: comment.likes?.length || 0,
    repliesCount: comment.replies?.length || 0,
    isLiked: currentUserId ? comment.likes?.some((l: any) => l.toString() === currentUserId) : false,
    canEdit: currentUserId ? comment.user?._id?.toString() === currentUserId : false,
  }
}