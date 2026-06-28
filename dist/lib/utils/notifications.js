import { NotificationService } from '@/lib/services/notificationService';
export async function createLikeNotification(params) {
    const message = `liked your post${params.postTitle ? `: "${params.postTitle}"` : ''}`;
    return NotificationService.createNotification({
        userId: params.postOwnerId,
        type: 'like',
        fromUserId: params.likedByUserId,
        postId: params.postId,
        message,
        actionUrl: `/post/${params.postId}`
    });
}
export async function createCommentNotification(params) {
    const message = `commented on your post${params.postTitle ? `: "${params.postTitle}"` : ''}`;
    return NotificationService.createNotification({
        userId: params.postOwnerId,
        type: 'comment',
        fromUserId: params.commentByUserId,
        postId: params.postId,
        message,
        actionUrl: `/post/${params.postId}`
    });
}
export async function createFollowNotification(params) {
    return NotificationService.createNotification({
        userId: params.followingId,
        type: 'follow',
        fromUserId: params.followerId,
        message: 'started following you',
        actionUrl: `/profile/${params.followerId}`
    });
}
export async function createCourseNotification(params) {
    const messages = {
        enrollment: `You enrolled in "${params.courseTitle}"`,
        completion: `You completed "${params.courseTitle}"! 🎉`,
        new_lesson: `New lesson available in "${params.courseTitle}"`
    };
    return NotificationService.createNotification({
        userId: params.userId,
        type: 'course',
        courseId: params.courseId,
        message: messages[params.type],
        actionUrl: `/courses/${params.courseId}`
    });
}
