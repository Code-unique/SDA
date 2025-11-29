// lib/services/notificationService.ts
import Notification from '@/lib/models/Notification'
import User from '@/lib/models/User'
import { Types } from 'mongoose'
import { connectToDatabase } from '@/lib/mongodb'
import Post from '@/lib/models/Post'


export interface CreateNotificationParams {
  userId: string | Types.ObjectId
  type: 'like' | 'comment' | 'follow' | 'course' | 'achievement' | 'message'
  fromUserId?: string | Types.ObjectId
  postId?: string | Types.ObjectId
  courseId?: string | Types.ObjectId
  message: string
  actionUrl?: string
}

export class NotificationService {
  // ---------------------------
  // CREATE NOTIFICATION
  // ---------------------------
  static async createNotification(params: CreateNotificationParams) {
    try {
      await connectToDatabase()    // 🔥 REQUIRED

      const notification = new Notification({
        user: params.userId,
        type: params.type,
        fromUser: params.fromUserId,
        post: params.postId,
        course: params.courseId,
        message: params.message,
        actionUrl: params.actionUrl,
      })

      await notification.save()
      return await notification.populate([
        { path: 'fromUser', select: 'username firstName lastName avatar' },
        { path: 'post', select: 'caption' },
        { path: 'course', select: 'title' }
      ])
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // ---------------------------
  // GET USER NOTIFICATIONS
  // ---------------------------
  static async getUserNotifications(userId: string, options: {
    page?: number
    limit?: number
    unreadOnly?: boolean
  } = {}) {
    try {
      await connectToDatabase()    // 🔥 REQUIRED

      const { page = 1, limit = 20, unreadOnly = false } = options
      const skip = (page - 1) * limit

      const dbUser = await User.findOne({ clerkId: userId })
      if (!dbUser) throw new Error('User not found')

      const query: any = { user: dbUser._id }
      if (unreadOnly) query.read = false

      const notifications = await Notification.find(query)
        .populate('fromUser', 'username firstName lastName avatar')
        .populate('post', 'caption')
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

      const total = await Notification.countDocuments(query)
      const unreadCount = await Notification.countDocuments({
        user: dbUser._id,
        read: false
      })

      return {
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }
  }

  // ---------------------------
  // MARK SELECTED AS READ
  // ---------------------------
  static async markAsRead(notificationIds: string[], userId: string) {
    try {
      await connectToDatabase()    // 🔥 REQUIRED

      const dbUser = await User.findOne({ clerkId: userId })
      if (!dbUser) throw new Error('User not found')

      await Notification.updateMany(
        { _id: { $in: notificationIds }, user: dbUser._id },
        { $set: { read: true } }
      )

      return { success: true }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      throw error
    }
  }

  // ---------------------------
  // MARK ALL AS READ
  // ---------------------------
  static async markAllAsRead(userId: string) {
    try {
      await connectToDatabase()    // 🔥 REQUIRED

      const dbUser = await User.findOne({ clerkId: userId })
      if (!dbUser) throw new Error('User not found')

      await Notification.updateMany(
        { user: dbUser._id, read: false },
        { $set: { read: true } }
      )

      return { success: true }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  // ---------------------------
  // GET UNREAD COUNT
  // ---------------------------
  static async getUnreadCount(userId: string) {
    try {
      await connectToDatabase()    // 🔥 REQUIRED

      const dbUser = await User.findOne({ clerkId: userId })
      if (!dbUser) throw new Error('User not found')

      return await Notification.countDocuments({
        user: dbUser._id,
        read: false
      })
    } catch (error) {
      console.error('Error getting unread count:', error)
      throw error
    }
  }
}
