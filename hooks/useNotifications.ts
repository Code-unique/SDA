import { useState, useEffect, useCallback, useRef } from 'react'

interface Notification {
  _id: string
  type: string
  fromUser?: any
  message: string
  read: boolean
  actionUrl?: string
  createdAt: string
}

export function useNotifications(options?: {
  autoFetch?: boolean
  pollInterval?: number
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const { autoFetch = true, pollInterval = 60000 } = options || {}

  const fetchNotifications = useCallback(async (unreadOnly = false, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        unreadOnly: unreadOnly.toString(),
        limit: '20'
      });
      
      const response = await fetch(`/api/notifications?${params}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      setError(null);
      
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark as read: ${response.status}`);
      }

      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return { success: true };
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
      return { success: false, error: err };
    }
  };

  const markAllAsRead = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark all as read: ${response.status}`);
      }

      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
      
      return { success: true };
    } catch (err) {
      console.error('Error marking all as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark all as read');
      return { success: false, error: err };
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }

      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n._id === notificationId);
        return notification && !notification.read ? Math.max(0, prev - 1) : prev;
      });
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
      return { success: false, error: err };
    }
  };

  // Setup polling if enabled
  useEffect(() => {
    if (autoFetch && pollInterval > 0) {
      fetchNotifications(false, false);
      
      pollIntervalRef.current = setInterval(() => {
        fetchNotifications(false, false);
      }, pollInterval);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [autoFetch, pollInterval, fetchNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: () => fetchNotifications(false, true)
  };
}