// app/admin/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Image, BookOpen, TrendingUp, Eye, BarChart3, Heart, Clock, MessageSquare } from 'lucide-react'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import Course from '@/lib/models/Course'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

async function getAdminStats() {
  await connectToDatabase()

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  try {
    const [
      totalUsers,
      totalPosts,
      totalCourses,
      newUsersThisWeek,
      popularPosts,
      activeUsersCount
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Course.countDocuments(),
      User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      Post.find({ isPublic: true })
        .populate('author', 'username')
        .sort({ likes: -1 })
        .limit(5)
        .select('caption author likes createdAt')
        .lean(),
      User.countDocuments({ 
        lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
      })
    ])

    // Format posts for display
    const formattedPopularPosts = (Array.isArray(popularPosts) ? popularPosts : []).map((post: any) => {
      const authorName = post.author?.username || 'Unknown'
      return {
        _id: post._id?.toString() || '',
        caption: post.caption || 'Untitled Post',
        author: { username: authorName },
        likes: Array.isArray(post.likes) ? post.likes.length : 0,
        timeAgo: getTimeAgo(post.createdAt)
      }
    })

    return {
      totalUsers,
      totalPosts,
      totalCourses,
      newUsersThisWeek,
      activeUsersCount,
      popularPosts: formattedPopularPosts,
    }
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return {
      totalUsers: 0,
      totalPosts: 0,
      totalCourses: 0,
      newUsersThisWeek: 0,
      activeUsersCount: 0,
      popularPosts: [],
    }
  }
}

// Helper function for time display
function getTimeAgo(date: Date | string) {
  if (!date) return 'Recently'
  
  const dateObj = new Date(date)
  const seconds = Math.floor((new Date().getTime() - dateObj.getTime()) / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 604800)}w ago`
}

export default async function AdminDashboard() {
  const stats = await getAdminStats()

  // Quick Actions data
  const quickActions = [
    { href: '/admin/users', icon: Users, label: 'Users' },
    { href: '/admin/posts', icon: Image, label: 'Posts' },
    { href: '/admin/courses', icon: BookOpen, label: 'Courses' },
    { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 text-sm">
            Platform overview and quick actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" prefetch={false}>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">View Site</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                +{stats.newUsersThisWeek} this week
              </div>
              <Badge variant="secondary" className="text-xs">
                {stats.activeUsersCount} active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts</CardTitle>
            <Image className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts.toLocaleString()}</div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Public content
            </p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Published courses
            </p>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalPosts > 0 ? Math.round(stats.totalUsers / stats.totalPosts) : 0}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              Users per post
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Posts */}
        <Card className="border">
          <CardHeader>
            <CardTitle>Popular Posts</CardTitle>
            <CardDescription>
              Most engaged content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.popularPosts.length > 0 ? (
              <div className="space-y-3">
                {stats.popularPosts.map((post, index) => (
                  <div 
                    key={post._id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {post.caption}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-slate-500 truncate">
                            @{post.author.username}
                          </p>
                          <span className="text-xs text-slate-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {post.timeAgo}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                        <Heart className="w-4 h-4" />
                        <span className="font-medium">{post.likes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No posts yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card className="border">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link 
                      key={action.href}
                      href={action.href}
                      className="block"
                    >
                      <Button 
                        variant="outline" 
                        className="w-full h-auto py-4 flex flex-col items-center justify-center gap-3 border"
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{action.label}</span>
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Stats */}
          <Card className="border">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Weekly Growth</p>
                      <p className="text-xs text-slate-500">New users</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{stats.newUsersThisWeek}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800">
                      <Heart className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Engagement</p>
                      <p className="text-xs text-slate-500">Post interactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {stats.popularPosts.reduce((sum, post) => sum + post.likes, 0)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800">
                      <BarChart3 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Content Ratio</p>
                      <p className="text-xs text-slate-500">Users to posts</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {stats.totalPosts > 0 ? Math.round(stats.totalUsers / stats.totalPosts) : 0}:1
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}