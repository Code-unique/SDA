// lib/mobile/permissions.ts
import { Types } from 'mongoose'

export function isOwner(userId: Types.ObjectId, resourceOwnerId: Types.ObjectId): boolean {
  return userId.toString() === resourceOwnerId.toString()
}

export function canEditPost(userId: Types.ObjectId, post: any): boolean {
  return isOwner(userId, post.author)
}

export function canEditComment(userId: Types.ObjectId, comment: any): boolean {
  return isOwner(userId, comment.user)
}

export function canDeleteComment(
  userId: Types.ObjectId,
  comment: any,
  postAuthorId: Types.ObjectId,
  userRole: string
): boolean {
  if (isOwner(userId, comment.user)) return true
  if (isOwner(userId, postAuthorId)) return true
  if (userRole === 'admin') return true
  return false
}

export function isAdmin(user: any): boolean {
  return user.role === 'admin'
}

export function isInstructor(user: any): boolean {
  return user.role === 'instructor'
}

export function isAdminOrInstructor(user: any): boolean {
  return ['admin', 'instructor'].includes(user.role)
}