// lib/mobile/validation.ts
import { Types } from 'mongoose'
import { z } from 'zod'

export const objectIdSchema = z.string().refine(
  (val) => Types.ObjectId.isValid(val),
  { message: 'Invalid ID format' }
)

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long')

export const bioSchema = z.string()
  .max(500, 'Bio too long (max 500 characters)')
  .optional()

export const captionSchema = z.string()
  .min(1, 'Caption is required')
  .max(2200, 'Caption too long (max 2200 characters)')

export const commentSchema = z.string()
  .min(1, 'Comment is required')
  .max(1000, 'Comment too long (max 1000 characters)')

export const replySchema = z.string()
  .min(1, 'Reply is required')
  .max(500, 'Reply too long (max 500 characters)')

export const mediaTypeSchema = z.enum(['image', 'video'])
export const mediaItemSchema = z.object({
  type: mediaTypeSchema,
  url: z.string().url('Invalid media URL'),
  thumbnail: z.string().url().optional(),
  duration: z.number().int().positive().optional(),
  order: z.number().int().min(0).optional(),
})

export const postMediaSchema = z.array(mediaItemSchema)
  .min(1, 'At least one media item is required')
  .max(4, 'Maximum 4 media items allowed')

export const postFilterSchema = z.object({
  type: z.enum(['all', 'images', 'videos']).default('all'),
  sort: z.enum(['recent', 'popular', 'trending']).default('recent'),
  hashtag: z.string().optional(),
  search: z.string().optional(),
})

export const courseFilterSchema = z.object({
  category: z.string().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  price: z.enum(['all', 'free', 'paid']).default('all'),
  search: z.string().optional(),
})

/**
 * Helper to get Zod error message from safeParse result
 * Uses .issues array (Zod v3+)
 */
export function getZodErrorMessage(error: any): string {
  return error.issues?.[0]?.message || 'Validation failed'
}

/**
 * Helper to get Zod error messages as object
 * Uses .issues array (Zod v3+)
 */
export function getZodErrorMessages(error: any): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  error.issues?.forEach((err: any) => {
    const path = err.path.join('.') || 'unknown'
    if (!errors[path]) {
      errors[path] = []
    }
    errors[path].push(err.message)
  })
  return errors
}

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id)
}

/**
 * Validate and parse pagination
 */
export function parsePagination(searchParams: URLSearchParams) {
  const result = paginationSchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })

  if (!result.success) {
    return { page: 1, limit: 10 }
  }

  return result.data
}

/**
 * Validate post filters
 */
export function parsePostFilters(searchParams: URLSearchParams) {
  const result = postFilterSchema.safeParse({
    type: searchParams.get('type'),
    sort: searchParams.get('sort'),
    hashtag: searchParams.get('hashtag'),
    search: searchParams.get('search'),
  })

  if (!result.success) {
    return { type: 'all', sort: 'recent' }
  }

  return result.data
}

/**
 * Validate course filters
 */
export function parseCourseFilters(searchParams: URLSearchParams) {
  const result = courseFilterSchema.safeParse({
    category: searchParams.get('category'),
    level: searchParams.get('level'),
    price: searchParams.get('price'),
    search: searchParams.get('search'),
  })

  if (!result.success) {
    return { price: 'all' }
  }

  return result.data
}

/**
 * Validate array of ObjectIds
 */
export function validateObjectIds(ids: string[]): boolean {
  return ids.every((id) => Types.ObjectId.isValid(id))
}