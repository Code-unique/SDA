// app/admin/posts/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Filter, MoreHorizontal, Eye, EyeOff, Trash2, User, Video, Image, AlertCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'

interface Post {
  _id: string
  author: {
    username: string
    firstName: string
    lastName: string
    avatar: string
  }
  caption: string
  media: Array<{ 
    url: string, 
    type: 'image' | 'video',
    duration?: number,
    thumbnail?: string
  }>
  likes: string[]
  comments: any[]
  saves: string[]
  isPublic: boolean
  createdAt: string
  mediaCount: number
  totalDuration: number
  containsVideo: boolean
  views: number
  engagement: number
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'images' | 'videos'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'engagement'>('recent')

  // ✅ Call useToast only here, at top level of component
  const { toast } = useToast()

  useEffect(() => {
    loadPosts()
  }, [filterType, sortBy])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/posts?type=${filterType}&sort=${sortBy}`)
      const data = await response.json()
      if (response.ok) {
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      // ✅ Use the toast from above
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePostVisibility = async (postId: string, currentVisibility: boolean) => {
    try {
      const response = await fetch(`/api/admin/posts/${postId}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !currentVisibility }),
      })

      if (response.ok) {
        setPosts(posts.map(post =>
          post._id === postId ? { ...post, isPublic: !currentVisibility } : post
        ))
        toast({
          title: "Success",
          description: `Post ${!currentVisibility ? 'published' : 'hidden'} successfully`
        })
      }
    } catch (error) {
      console.error('Error updating post visibility:', error)
      toast({
        title: "Error",
        description: "Failed to update post visibility",
        variant: "destructive"
      })
    }
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' })

      if (response.ok) {
        setPosts(posts.filter(post => post._id !== postId))
        toast({
          title: "Success",
          description: "Post deleted successfully"
        })
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      })
    }
  }

  const filteredPosts = posts.filter(post => {
    const searchLower = searchQuery.toLowerCase()
    return (
      post.caption.toLowerCase().includes(searchLower) ||
      post.author.username.toLowerCase().includes(searchLower) ||
      `${post.author.firstName} ${post.author.lastName}`.toLowerCase().includes(searchLower)
    )
  })

  const getMediaStats = () => {
    const totalPosts = posts.length
    const totalImages = posts.reduce((sum, post) => 
      sum + post.media.filter(m => m.type === 'image').length, 0
    )
    const totalVideos = posts.reduce((sum, post) => 
      sum + post.media.filter(m => m.type === 'video').length, 0
    )
    const avgEngagement = posts.length > 0 
      ? posts.reduce((sum, post) => sum + (post.engagement || 0), 0) / posts.length 
      : 0

    return { totalPosts, totalImages, totalVideos, avgEngagement }
  }

  const stats = getMediaStats()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">Post Management</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Moderate and manage platform posts
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Posts</p>
                <p className="text-2xl font-bold">{stats.totalPosts}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Image className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Images</p>
                <p className="text-2xl font-bold">{stats.totalImages}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Image className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Videos</p>
                <p className="text-2xl font-bold">{stats.totalVideos}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Avg. Engagement</p>
                <p className="text-2xl font-bold">{stats.avgEngagement.toFixed(1)}%</p>
              </div>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search posts by content, author, or hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-[140px] rounded-2xl">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="images">Images Only</SelectItem>
                  <SelectItem value="videos">Videos Only</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[140px] rounded-2xl">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="engagement">Highest Engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Posts ({filteredPosts.length})</CardTitle>
          <CardDescription>
            All posts on the platform with media information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No posts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <div key={post._id} className="flex items-start justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Media Preview with Carousel */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {post.media[0]?.type === 'video' ? (
                          <div className="relative w-full h-full">
                            <img
                              src={post.media[0].thumbnail || post.media[0].url}
                              alt="Video thumbnail"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Video className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={post.media[0].url}
                            alt="Post preview"
                            className="w-full h-full object-cover"
                          />
                        )}
                        
                        {/* Multiple Media Indicator */}
                        {post.mediaCount > 1 && (
                          <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                            +{post.mediaCount - 1}
                          </div>
                        )}
                      </div>
                      
                      {/* Media Type Badge */}
                      {post.containsVideo && (
                        <Badge className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-xs px-2">
                          Video
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <img
                          src={post.author.avatar || '/default-avatar.png'}
                          alt={post.author.username}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="font-medium text-sm">
                          {post.author.firstName} {post.author.lastName}
                        </span>
                        <span className="text-slate-500 text-sm">
                          @{post.author.username}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 line-clamp-2">
                        {post.caption}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{post.mediaCount} media</span>
                        {post.containsVideo && post.totalDuration && (
                          <>
                            <span>•</span>
                            <span>{Math.floor(post.totalDuration)}s</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{post.likes.length} likes</span>
                        <span>•</span>
                        <span>{post.comments.length} comments</span>
                        <span>•</span>
                        <span>{post.saves?.length || 0} saves</span>
                        <span>•</span>
                        <span className={`px-2 py-1 rounded-full ${
                          post.isPublic 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {post.isPublic ? 'Public' : 'Hidden'}
                        </span>
                        {post.engagement && (
                          <>
                            <span>•</span>
                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              {post.engagement.toFixed(1)}% engagement
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePostVisibility(post._id, post.isPublic)}
                      className="rounded-xl"
                      title={post.isPublic ? 'Hide post' : 'Show post'}
                    >
                      {post.isPublic ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`/posts/${post._id}`, '_blank')}
                      className="rounded-xl"
                      title="View post"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePost(post._id)}
                      className="rounded-xl text-red-500 hover:text-red-600"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}