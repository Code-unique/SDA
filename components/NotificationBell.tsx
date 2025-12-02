// components/NotificationBell.tsx
'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'

interface Notification {
  _id: string
  type: string
  fromUser?: {
    _id: string
    username: string
    firstName: string
    lastName: string
    avatar: string
  }
  message: string
  read: boolean
  actionUrl?: string
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const fetchNotifications = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const response = await fetch('/api/notifications?limit=5', {
        next: { revalidate: 30 } // Revalidate every 30 seconds
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
    setDropdownOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'follow': return '👤';
      case 'course': return '📚';
      case 'achievement': return '🎉';
      case 'message': return '✉️';
      default: return '🔔';
    }
  };

  const getNotificationTime = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return created.toLocaleDateString();
  };

  useEffect(() => {
    if (dropdownOpen) {
      fetchNotifications();
    }
  }, [dropdownOpen]);

  // Poll for new notifications every 60 seconds when dropdown is open
  useEffect(() => {
    if (!dropdownOpen) return;
    
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [dropdownOpen]);

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-[80vh] overflow-hidden"
        onInteractOutside={() => setDropdownOpen(false)}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-base">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
                className="h-8 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                router.push('/notifications');
                setDropdownOpen(false);
              }}
              className="h-8 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              View all
            </Button>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-muted-foreground text-sm mb-2">
                No notifications
              </div>
              <p className="text-xs text-muted-foreground">
                You're all caught up!
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification._id}
                className={`p-3 cursor-pointer border-b last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-800 ${
                  !notification.read ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3 w-full">
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getNotificationTime(notification.createdAt)}
                    </p>
                    {notification.fromUser && (
                      <div className="flex items-center gap-2 mt-2">
                        <img
                          src={notification.fromUser.avatar || '/default-avatar.png'}
                          alt={notification.fromUser.username}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-xs text-muted-foreground">
                          {notification.fromUser.firstName} {notification.fromUser.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-rose-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-sm"
              onClick={() => {
                router.push('/notifications');
                setDropdownOpen(false);
              }}
            >
              See all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}