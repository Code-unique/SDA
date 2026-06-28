// app/dashboard/page.tsx
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Users, BookOpen, MessageSquare, TrendingUp, Eye, Sparkles, Heart } from 'lucide-react'
import Link from 'next/link'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import Course from '@/lib/models/Course'

async function getDashboardData(clerkId: string) {
  try {
    await connectToDatabase()
    
    // First, find existing user
    let user = await User.findOne({ clerkId })
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar')
    
    // If user doesn't exist, get clerk user info
    if (!user) {
      const clerkUser = await currentUser()
      if (!clerkUser) {
        throw new Error('User not found in Clerk')
      }
      
      const email = clerkUser.emailAddresses[0]?.emailAddress || ''
      
      // IMPORTANT: Check if email already exists in database
      const existingUserByEmail = await User.findOne({ email })
      
      if (existingUserByEmail) {
        // User exists by email but has different clerkId
        // Update with current clerkId
        user = await User.findOneAndUpdate(
          { email },
          { 
            $set: { 
              clerkId,
              username: clerkUser.username || existingUserByEmail.username,
              firstName: clerkUser.firstName || existingUserByEmail.firstName,
              lastName: clerkUser.lastName || existingUserByEmail.lastName,
              avatar: clerkUser.imageUrl || existingUserByEmail.avatar
            }
          },
          { new: true }
        )
      } else {
        // Create new user if email doesn't exist
        try {
          user = await User.create({
            clerkId,
            email,
            username: clerkUser.username || `user_${clerkId.slice(0, 8)}`,
            firstName: clerkUser.firstName || 'User',
            lastName: clerkUser.lastName || 'Name',
            avatar: clerkUser.imageUrl || '',
            banner: '',
            bio: '',
            location: '',
            website: '',
            role: 'user',
            interests: [],
            skills: [],
            isVerified: false,
            followers: [],
            following: [],
            onboardingCompleted: false,
            notificationPreferences: {
              likes: true,
              comments: true,
              follows: true,
              courses: true,
              achievements: true,
              messages: true,
              announcements: true,
              marketing: false
            },
            lastNotificationReadAt: new Date()
          })
        } catch (error: any) {
          // Handle duplicate key error
          if (error.code === 11000) {
            // Race condition - try to find existing user again
            user = await User.findOne({ email })
            if (!user) {
              throw error
            }
          } else {
            throw error
          }
        }
      }
      
      // Repopulate after creation/update
      if (user) {
        user = await User.findOne({ clerkId })
          .populate('followers', 'username avatar')
          .populate('following', 'username avatar')
      }
    }
    
    if (!user) {
      throw new Error('Failed to create or find user')
    }

    // Get dashboard data
    const [postCount, courseCount, recentPosts, popularCourses] = await Promise.all([
      Post.countDocuments({ author: user._id }),
      Course.countDocuments({ 'students.user': user._id }),
      Post.find({ author: user._id })
        .populate('author', 'username firstName lastName avatar')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Course.find({ isPublished: true })
        .populate('instructor', 'username firstName lastName avatar')
        .sort({ totalStudents: -1 })
        .limit(2)
        .lean()
    ])

    return {
      user: {
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        role: user.role
      },
      stats: {
        posts: postCount,
        courses: courseCount,
        followers: user.followers.length,
        following: user.following.length
      },
      recentPosts,
      popularCourses
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    throw error
  }
}

export default async function DashboardPage() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  const data = await getDashboardData(user.id)

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">
              Welcome back, {data.user.firstName}! 👋
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Ready to create something amazing today?
            </p>
          </div>
          <Link href="/dashboard/posts/create">
            <Button variant="premium" className="rounded-2xl">
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.followers}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              {data.stats.followers > 0 ? '+12% from last month' : 'Start building your audience'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.posts}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.posts > 0 ? '+2 this week' : 'Create your first post'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.courses}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.courses > 0 ? '2 in progress' : 'Explore courses'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">86%</div>
            <p className="text-xs text-muted-foreground">
              Profile completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>
              Your latest design shares
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentPosts.length > 0 ? (
                data.recentPosts.map((post: any) => (
                  <div key={post._id} className="flex items-center space-x-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium line-clamp-1">{post.caption || 'Untitled Post'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-slate-500">
                      <Heart className="w-4 h-4" />
                      <span>{post.likes?.length || 0}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">No posts yet</p>
                  <Link href="/dashboard/posts/create">
                    <Button variant="premium" size="sm">
                      Create First Post
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions & Recommended */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Quickly access important features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Link href="/dashboard/posts/create">
                  <Card className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-rose-300 text-center group">
                    <Plus className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-rose-500 transition-colors" />
                    <p className="text-sm font-medium">Create Post</p>
                  </Card>
                </Link>
                
                <Link href="/courses">
                  <Card className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow bg-slate-50 dark:bg-slate-800 group">
                    <BookOpen className="w-8 h-8 text-rose-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-center">Browse Courses</p>
                  </Card>
                </Link>

                <Link href="/ai-coach">
                  <Card className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow bg-slate-50 dark:bg-slate-800 group">
                    <Sparkles className="w-8 h-8 text-rose-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-center">AI Coach</p>
                  </Card>
                </Link>

                <Link href="/explore">
                  <Card className="rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow bg-slate-50 dark:bg-slate-800 group">
                    <Users className="w-8 h-8 text-rose-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-medium text-center">Explore</p>
                  </Card>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Courses */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Recommended Courses</CardTitle>
              <CardDescription>
                Continue your learning journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.popularCourses.length > 0 ? (
                  data.popularCourses.map((course: any) => (
                    <div key={course._id} className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl">
                      <h4 className="font-semibold mb-2 line-clamp-1">{course.title}</h4>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {course.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          By {course.instructor?.username || 'Unknown'}
                        </span>
                        <Button variant="premium" size="sm">
                          Enroll
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No courses available yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}