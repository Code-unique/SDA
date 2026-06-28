//lib/services/notificationService.ts
import Notification from '@/lib/models/Notification';
import User from '@/lib/models/User';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
export class NotificationService {
    static async validateUser(userId) {
        const dbUser = await User.findOne({ clerkId: userId });
        if (!dbUser)
            throw new Error('User not found');
        return dbUser;
    }
    // ---------------------------
    // CREATE NOTIFICATION
    // ---------------------------
    static async createNotification(params) {
        var _a;
        try {
            await connectToDatabase();
            const notification = new Notification({
                user: params.userId,
                type: params.type,
                fromUser: params.fromUserId,
                post: params.postId,
                course: params.courseId,
                message: params.message.substring(0, 500),
                actionUrl: (_a = params.actionUrl) === null || _a === void 0 ? void 0 : _a.substring(0, 500),
            });
            const savedNotification = await notification.save();
            return await Notification.findById(savedNotification._id)
                .populate('fromUser', 'username firstName lastName avatar')
                .populate('post', 'caption')
                .populate('course', 'title')
                .lean();
        }
        catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }
    // ---------------------------
    // GET USER NOTIFICATIONS
    // ---------------------------
    static async getUserNotifications(userId, options = {}) {
        try {
            await connectToDatabase();
            const { page = 1, limit = 20, unreadOnly = false } = options;
            const skip = (page - 1) * limit;
            const dbUser = await this.validateUser(userId);
            const query = { user: dbUser._id };
            if (unreadOnly)
                query.read = false;
            // Execute queries in parallel for better performance
            const [notifications, total, unreadCount] = await Promise.all([
                Notification.find(query)
                    .populate('fromUser', 'username firstName lastName avatar')
                    .populate('post', 'caption')
                    .populate('course', 'title')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Notification.countDocuments(query),
                Notification.countDocuments({ user: dbUser._id, read: false })
            ]);
            // Transform ObjectIds to strings
            const transformedNotifications = notifications.map(notification => {
                var _a, _b, _c;
                return (Object.assign(Object.assign({}, notification), { _id: notification._id.toString(), user: notification.user.toString(), fromUser: notification.fromUser ? Object.assign(Object.assign({}, notification.fromUser), { _id: ((_a = notification.fromUser._id) === null || _a === void 0 ? void 0 : _a.toString()) || '' }) : null, post: notification.post ? Object.assign(Object.assign({}, notification.post), { _id: ((_b = notification.post._id) === null || _b === void 0 ? void 0 : _b.toString()) || '' }) : null, course: notification.course ? Object.assign(Object.assign({}, notification.course), { _id: ((_c = notification.course._id) === null || _c === void 0 ? void 0 : _c.toString()) || '' }) : null }));
            });
            return {
                notifications: transformedNotifications,
                unreadCount,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    }
    // ---------------------------
    // MARK SELECTED AS READ
    // ---------------------------
    static async markAsRead(notificationIds, userId) {
        try {
            await connectToDatabase();
            const dbUser = await this.validateUser(userId);
            // Validate notification IDs
            const validIds = notificationIds.filter((id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id));
            if (validIds.length === 0) {
                throw new Error('No valid notification IDs provided');
            }
            const objectIds = validIds.map(id => new Types.ObjectId(id));
            await Notification.updateMany({
                _id: { $in: objectIds },
                user: dbUser._id,
                read: false // Only update if not already read
            }, { $set: { read: true } });
            return { success: true, updatedCount: validIds.length };
        }
        catch (error) {
            console.error('Error marking notifications as read:', error);
            throw error;
        }
    }
    // ---------------------------
    // MARK ALL AS READ
    // ---------------------------
    static async markAllAsRead(userId) {
        try {
            await connectToDatabase();
            const dbUser = await this.validateUser(userId);
            const result = await Notification.updateMany({ user: dbUser._id, read: false }, { $set: { read: true } });
            return {
                success: true,
                modifiedCount: result.modifiedCount
            };
        }
        catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }
    // Add this method after the markAsRead method:
    // ---------------------------
    // MARK SELECTED AS UNREAD
    // ---------------------------
    static async markAsUnread(notificationIds, userId) {
        try {
            await connectToDatabase();
            const dbUser = await User.findOne({ clerkId: userId });
            if (!dbUser)
                throw new Error('User not found');
            // Validate notification IDs
            const validIds = notificationIds.filter((id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id));
            if (validIds.length === 0) {
                throw new Error('No valid notification IDs provided');
            }
            const objectIds = validIds.map(id => new Types.ObjectId(id));
            const result = await Notification.updateMany({
                _id: { $in: objectIds },
                user: dbUser._id,
                read: true // Only update if currently read
            }, { $set: { read: false } });
            return {
                success: result.modifiedCount > 0,
                modifiedCount: result.modifiedCount
            };
        }
        catch (error) {
            console.error('Error marking notifications as unread:', error);
            throw error;
        }
    }
    // ---------------------------
    // GET UNREAD COUNT
    // ---------------------------
    static async getUnreadCount(userId) {
        try {
            await connectToDatabase();
            const dbUser = await this.validateUser(userId);
            const count = await Notification.countDocuments({
                user: dbUser._id,
                read: false
            });
            return count;
        }
        catch (error) {
            console.error('Error getting unread count:', error);
            throw error;
        }
    }
    // ---------------------------
    // DELETE NOTIFICATION
    // ---------------------------
    static async deleteNotification(notificationId, userId) {
        try {
            await connectToDatabase();
            const dbUser = await this.validateUser(userId);
            const result = await Notification.deleteOne({
                _id: new Types.ObjectId(notificationId),
                user: dbUser._id
            });
            return {
                success: result.deletedCount > 0,
                deletedCount: result.deletedCount
            };
        }
        catch (error) {
            console.error('Error deleting notification:', error);
            throw error;
        }
    }
}
