export function formatNotificationTime(createdAt: string | Date): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  
  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  
  return created.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined
  });
}

export function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    like: '❤️',
    comment: '💬',
    follow: '👤',
    course: '📚',
    achievement: '🏆',
    message: '✉️',
    system: '🔔'
  };
  return icons[type] || '🔔';
}

export function generateNotificationMessage(
  type: string,
  data: {
    username?: string;
    firstName?: string;
    lastName?: string;
    postTitle?: string;
    courseTitle?: string;
    achievementName?: string;
  }
): string {
  const { username, firstName, lastName, postTitle, courseTitle, achievementName } = data;
  const name = firstName && lastName ? `${firstName} ${lastName}` : username || 'Someone';
  
  switch (type) {
    case 'like':
      return `${name} liked your post${postTitle ? `: "${postTitle}"` : ''}`;
    case 'comment':
      return `${name} commented on your post${postTitle ? `: "${postTitle}"` : ''}`;
    case 'follow':
      return `${name} started following you`;
    case 'course':
      return `New course available: ${courseTitle || 'Check it out!'}`;
    case 'achievement':
      return `You earned the "${achievementName || 'New Achievement'}" badge!`;
    case 'message':
      return `New message from ${name}`;
    default:
      return 'You have a new notification';
  }
}