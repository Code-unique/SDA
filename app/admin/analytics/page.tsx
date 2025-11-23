// app/admin/analytics/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Image, BookOpen, TrendingUp, Eye, BarChart3, Heart, MessageCircle, Calendar } from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalUsers: number
    totalPosts: number
    totalCourses: number
    newUsersThisWeek: number
    newUsersThisMonth: number
    activeUsersThisWeek: number
    engagementRate: string
  }
  growth: Array<{ date: string; users: number }>
  popularContent: {
    posts: Array<{
      id: string
      title: string
      author: string
      likes: number
      comments: number
    }>
    courses: Array<any>
  }
  engagement: {
    totalLikes: number
    totalComments: number
    avgLikesPerPost: number
    avgCommentsPerPost: number
  }
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week')

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`)
      const data = await response.json()
      if (response.ok) {
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <Card className="rounded-2xl">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load analytics</h3>
            <p className="text-slate-500 mb-4">Please try again later</p>
            <Button onClick={loadAnalytics}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">Analytics Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Platform performance and user insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {(['week', 'month', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "premium" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="rounded-2xl capitalize"
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalUsers}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              +{analytics.overview.newUsersThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.activeUsersThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.engagementRate}% engagement rate
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalPosts}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.engagement.avgLikesPerPost.toFixed(1)} avg likes
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.newUsersThisMonth} new this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Engagement Metrics</CardTitle>
            <CardDescription>
              User interaction and content performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center space-x-3">
                  <Heart className="w-8 h-8 text-rose-500" />
                  <div>
                    <p className="font-semibold">Total Likes</p>
                    <p className="text-sm text-slate-500">Across all posts</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-rose-600">
                  {analytics.engagement.totalLikes}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="font-semibold">Total Comments</p>
                    <p className="text-sm text-slate-500">User discussions</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.engagement.totalComments}
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="flex items-center space-x-3">
                  <Users className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-semibold">Active Users</p>
                    <p className="text-sm text-slate-500">Past 7 days</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {analytics.overview.activeUsersThisWeek}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Popular Content */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Popular Content</CardTitle>
            <CardDescription>
              Most engaged posts this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.popularContent.posts.slice(0, 5).map((post, index) => (
                <div key={post.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {post.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        by @{post.author}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>{post.likes}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Growth Chart */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
          <CardDescription>
            New user registrations over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end space-x-2 pb-4">
            {analytics.growth.slice(-14).map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                <div 
                  className="w-full bg-gradient-to-t from-rose-500 to-pink-500 rounded-t-lg transition-all hover:opacity-80"
                  style={{ height: `${(day.users / Math.max(...analytics.growth.map(d => d.users))) * 80}%` }}
                />
                <span className="text-xs text-slate-500">
                  {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}