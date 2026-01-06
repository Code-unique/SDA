// components/posts/feed.tsx
'use client'

import { useState, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { EnhancedPostCard } from './enhanced-post-card'
import { Button } from '@/components/ui/button'
import { Loader2, Filter } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Post {
  _id: string
  author: {
    _id: string
    username: string
    firstName: string
    lastName: string
    avatar: string
    isVerified?: boolean
    isPro?: boolean
  }
  media: Array<{
    type: 'image' | 'video'
    url: string
    thumbnail?: string
    duration?: number
  }>
  caption: string
  hashtags: string[]
  likes: string[]
  saves: string[]
  comments: Array<{
    _id: string
    user: {
      _id: string
      username: string
      firstName: string
      lastName: string
      avatar: string
    }
    text: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
  mediaCount: number
  containsVideo: boolean
  totalDuration?: number
  isFeatured?: boolean
}

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [ref, inView] = useInView()
  const [feedType, setFeedType] = useState<'following' | 'explore' | 'featured'>('following')
  const [mediaFilter, setMediaFilter] = useState<'all' | 'images' | 'videos'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent')

  const loadPosts = async (pageNum: number = 1, reset: boolean = false) => {
    if (loading) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
        type: mediaFilter,
        sort: sortBy
      })

      let endpoint = '/api/posts/feed'
      if (feedType === 'explore') {
        endpoint = '/api/posts/explore'
      } else if (feedType === 'featured') {
        endpoint = '/api/posts/featured'
      }

      const response = await fetch(`${endpoint}?${params}`)
      const data = await response.json()

      if (response.ok) {
        if (reset || pageNum === 1) {
          setPosts(data.posts)
        } else {
          setPosts(prev => [...prev, ...data.posts])
        }
        setHasMore(data.pagination.page < data.pagination.pages)
        setPage(pageNum)
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Reload when filters change
  useEffect(() => {
    loadPosts(1, true)
  }, [feedType, mediaFilter, sortBy])

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadPosts(page + 1)
    }
  }, [inView, hasMore, loading, page])

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        // Optimistic update
        setPosts(prev =>
          prev.map(post => {
            if (post._id === postId) {
              const isLiked = post.likes.includes('current-user') // You'll need actual user ID
              return {
                ...post,
                likes: isLiked 
                  ? post.likes.filter(id => id !== 'current-user')
                  : [...post.likes, 'current-user']
              }
            }
            return post
          })
        )
      }
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const handleSave = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        // Optimistic update
        setPosts(prev =>
          prev.map(post => {
            if (post._id === postId) {
              const isSaved = post.saves.includes('current-user') // You'll need actual user ID
              return {
                ...post,
                saves: isSaved 
                  ? post.saves.filter(id => id !== 'current-user')
                  : [...post.saves, 'current-user']
              }
            }
            return post
          })
        )
      }
    } catch (error) {
      console.error('Error saving post:', error)
    }
  }

  const handleComment = async (postId: string, comment: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: comment }),
      })

      if (response.ok) {
        // You might want to refresh the post or update locally
        loadPosts(page, true)
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Feed Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={feedType} onValueChange={(value: any) => setFeedType(value)} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="explore">Explore</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={mediaFilter} onValueChange={(value: any) => setMediaFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Media type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="images">Images Only</SelectItem>
              <SelectItem value="videos">Videos Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="space-y-6">
        {posts.map((post) => (
          <EnhancedPostCard
            key={post._id}
            post={post as any}
            onLike={() => handleLike(post._id)}
            onSave={() => handleSave(post._id)}
            onComment={(postId, text) => handleComment(postId, text)}
          />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div ref={ref} className="flex justify-center py-8">
          <Button variant="outline" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {/* No Posts */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-slate-500">
          You've reached the end of your feed
        </div>
      )}

      {posts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">No posts yet</div>
          <p className="text-slate-500">Follow some creators to see their posts here!</p>
        </div>
      )}
    </div>
  )
}