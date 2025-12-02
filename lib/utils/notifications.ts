import { NotificationService } from '@/lib/services/notificationService';

export async function createLikeNotification(params: {
  postId: string;
  likedByUserId: string;
  postOwnerId: string;
  postTitle?: string;
}) {
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

export async function createCommentNotification(params: {
  postId: string;
  commentByUserId: string;
  postOwnerId: string;
  postTitle?: string;
}) {
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

export async function createFollowNotification(params: {
  followerId: string;
  followingId: string;
}) {
  return NotificationService.createNotification({
    userId: params.followingId,
    type: 'follow',
    fromUserId: params.followerId,
    message: 'started following you',
    actionUrl: `/profile/${params.followerId}`
  });
}

export async function createCourseNotification(params: {
  userId: string;
  courseId: string;
  courseTitle: string;
  type: 'enrollment' | 'completion' | 'new_lesson';
}) {
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