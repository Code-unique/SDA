// lib/mobile/responses.ts - COMPLETE FIX
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
// SERIALIZERS - FIXED TO AVOID INFINITE RECURSION
// ============================================================

/**
 * Check if object is a Mongoose document with circular references
 */
function isMongooseDocument(obj: any): boolean {
  return obj && typeof obj === 'object' && 
    (obj._doc !== undefined || obj.$__ !== undefined || obj.toObject !== undefined)
}

/**
 * Safely convert Mongoose document to plain object
 */
function toPlainObject(obj: any): any {
  if (!obj) return obj
  if (typeof obj !== 'object') return obj
  if (obj instanceof Date) return obj
  if (obj instanceof Types.ObjectId) return obj.toString()
  
  // Handle Mongoose document
  if (isMongooseDocument(obj)) {
    try {
      return obj.toObject ? obj.toObject() : { ...obj }
    } catch {
      return { ...obj }
    }
  }
  
  return obj
}

/**
 * Serialize an object, converting ObjectIds and Dates - WITH CIRCULAR REFERENCE PROTECTION
 */
export function serializeObject(obj: any, seen = new WeakSet()): any {
  if (!obj) return obj
  if (typeof obj !== 'object') return obj
  
  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString()
  }
  
  // Handle ObjectId
  if (obj instanceof Types.ObjectId) {
    return obj.toString()
  }
  
  // Handle Mongoose document - convert to plain object first
  const plainObj = toPlainObject(obj)
  if (plainObj !== obj) {
    return serializeObject(plainObj, seen)
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => serializeObject(item, seen))
  }
  
  // Handle circular references
  if (seen.has(obj)) {
    return '[Circular]'
  }
  seen.add(obj)
  
  // Handle plain objects
  const result: any = {}
  for (const [key, value] of Object.entries(obj)) {
    // Skip Mongoose internal fields
    if (key.startsWith('$') || key === '__v' || key === '_doc') {
      continue
    }
    result[key] = serializeObject(value, seen)
  }
  
  return result
}

/**
 * Serialize a user for API response
 */
export function serializeUser(user: any) {
  if (!user) return null
  
  // First convert to plain object if it's a Mongoose document
  const plainUser = toPlainObject(user)
  
  // Then serialize
  const obj = serializeObject(plainUser)
  
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
  
  const plainPost = toPlainObject(post)
  const obj = serializeObject(plainPost)
  
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
  
  const plainCourse = toPlainObject(course)
  const obj = serializeObject(plainCourse)
  
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
  
  const plainComment = toPlainObject(comment)
  const obj = serializeObject(plainComment)
  
  return {
    ...obj,
    likesCount: comment.likes?.length || 0,
    repliesCount: comment.replies?.length || 0,
    isLiked: currentUserId ? comment.likes?.some((l: any) => l.toString() === currentUserId) : false,
    canEdit: currentUserId ? comment.user?._id?.toString() === currentUserId : false,
  }
}