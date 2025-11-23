// app/notifications/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, Check, User, Heart, MessageCircle, BookOpen, Zap, Loader2 } from 'lucide-react'

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        unreadOnly: (filter === 'unread').toString()
      })
      
      const response = await fetch(`/api/notifications?${params}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      } else {
        console.error('Failed to fetch notifications')
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(notificationId)
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds: [notificationId]
        }),
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId ? { ...notif, read: true } : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    } finally {
      setMarkingAsRead(null)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markAll: true
        }),
      })

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true }))
        )
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-rose-500" />
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />
      case 'follow':
        return <User className="w-5 h-5 text-green-500" />
      case 'course':
        return <BookOpen className="w-5 h-5 text-purple-500" />
      case 'achievement':
        return <Zap className="w-5 h-5 text-yellow-500" />
      default:
        return <Bell className="w-5 h-5 text-slate-500" />
    }
  }

  const getNotificationTime = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffInHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return created.toLocaleDateString()
    }
  }

  const filteredNotifications = notifications.filter(notif =>
    filter === 'all' ? true : !notif.read
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-rose-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold">Notifications</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Stay updated with your activity
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={markAllAsRead}
                className="rounded-2xl"
              >
                <Check className="w-4 h-4 mr-2" />
                Mark all as read
              </Button>
            )}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 rounded-xl text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <Bell className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                No notifications
              </h3>
              <p className="text-slate-500 dark:text-slate-500">
                {filter === 'unread' 
                  ? 'You have no unread notifications' 
                  : 'You have no notifications yet'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card 
                key={notification._id} 
                className={`rounded-2xl transition-all hover:shadow-lg ${
                  !notification.read ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-wrap">
                          {notification.fromUser && (
                            <img
                              src={notification.fromUser.avatar || '/default-avatar.png'}
                              alt={notification.fromUser.username}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <p className="text-slate-700 dark:text-slate-300 break-words">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <Badge variant="default" className="rounded-full bg-rose-500 flex-shrink-0">
                            New
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm text-slate-500">
                          {getNotificationTime(notification.createdAt)}
                        </span>
                        <div className="flex items-center space-x-2">
                          {notification.actionUrl && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl"
                              onClick={() => window.location.href = notification.actionUrl!}
                            >
                              View
                            </Button>
                          )}
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification._id)}
                              disabled={markingAsRead === notification._id}
                              className="rounded-xl text-slate-500 hover:text-slate-700"
                            >
                              {markingAsRead === notification._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}