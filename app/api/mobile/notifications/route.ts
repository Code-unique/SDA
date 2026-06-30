// app/api/mobile/notifications/route.ts
import { NextRequest } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import Notification from '@/lib/models/Notification'
import User from '@/lib/models/User'
import { requireUser } from '@/lib/mobile/auth'
import { mobileSuccess, mobileError, mobilePaginated } from '@/lib/mobile/responses'
import { parsePagination } from '@/lib/mobile/validation'
import { moderateRateLimit } from '@/lib/mobile/rate-limit'
import "@/lib/loadmodels"

/**
 * GET /api/mobile/notifications
 * Get user notifications
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await moderateRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const unreadOnly = searchParams.get('unread') === 'true'

    await connectToDatabase()

    const query: any = { userId: authResult.user._id }
    if (unreadOnly) {
      query.read = false
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('fromUserId', 'username firstName lastName avatar')
        .populate('postId', 'caption media')
        .populate('courseId', 'title slug thumbnail')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query)
    ])

    const transformedNotifications = notifications.map((n: any) => ({
      _id: n._id.toString(),
      type: n.type,
      message: n.message,
      read: n.read || false,
      actionUrl: n.actionUrl,
      fromUser: n.fromUserId ? {
        _id: n.fromUserId._id.toString(),
        username: n.fromUserId.username,
        firstName: n.fromUserId.firstName,
        lastName: n.fromUserId.lastName,
        avatar: n.fromUserId.avatar,
      } : null,
      post: n.postId ? {
        _id: n.postId._id.toString(),
        caption: n.postId.caption,
        media: n.postId.media,
      } : null,
      course: n.courseId ? {
        _id: n.courseId._id.toString(),
        title: n.courseId.title,
        slug: n.courseId.slug,
        thumbnail: n.courseId.thumbnail,
      } : null,
      createdAt: n.createdAt?.toISOString() || new Date().toISOString(),
    }))

    // Mark as read if not unread only
    if (!unreadOnly) {
      await Notification.updateMany(
        { userId: authResult.user._id, read: false },
        { $set: { read: true } }
      )
    }

    return mobilePaginated(transformedNotifications, { page, limit, total })
  } catch (error: any) {
    console.error('Notifications error:', error)
    return mobileError(error.message || 'Failed to fetch notifications', 500)
  }
}

/**
 * PATCH /api/mobile/notifications
 * Mark all notifications as read
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireUser(request)

  if (!authResult.success) {
    return mobileError(authResult.error, authResult.status)
  }

  try {
    await connectToDatabase()

    await Notification.updateMany(
      { userId: authResult.user._id, read: false },
      { $set: { read: true } }
    )

    return mobileSuccess({ read: true }, 'All notifications marked as read')
  } catch (error: any) {
    console.error('Mark read error:', error)
    return mobileError(error.message || 'Failed to mark notifications as read', 500)
  }
}