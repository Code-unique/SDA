// components/posts/feed.tsx
'use client'

import { useState, useEffect } from 'react'
import { useInView } from 'react-intersection-observer'
import { PostCard } from './post-card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface Post {
  _id: string
  author: {
    _id: string
    username: string
    firstName: string
    lastName: string
    avatar: string
  }
  media: Array<{
    type: 'image' | 'video'
    url: string
    thumbnail?: string
  }>
  caption: string
  hashtags: string[]
  likes: string[]
  saves: string[] // Add this
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
}

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [ref, inView] = useInView()

  const loadPosts = async (pageNum: number = 1) => {
    if (loading) return

    setLoading(true)
    try {
      const response = await fetch(`/api/posts/feed?page=${pageNum}&limit=10`)
      const data = await response.json()

      if (response.ok) {
        if (pageNum === 1) {
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

  useEffect(() => {
    loadPosts(1)
  }, [])

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadPosts(page + 1)
    }
  }, [inView, hasMore, loading, page])

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const updatedPost = await response.json()
        setPosts(prev =>
          prev.map(post =>
            post._id === postId ? { ...updatedPost, saves: updatedPost.saves || [] } : post
          )
        )
      }
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const handleComment = async (postId: string, comment: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: comment }),
      })

      if (response.ok) {
        const updatedPost = await response.json()
        setPosts(prev =>
          prev.map(post =>
            post._id === postId ? { ...updatedPost, saves: updatedPost.saves || [] } : post
          )
        )
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleSave = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const updatedPost = await response.json()
        setPosts(prev =>
          prev.map(post =>
            post._id === postId ? { ...updatedPost, saves: updatedPost.saves || [] } : post
          )
        )
      }
    } catch (error) {
      console.error('Error saving post:', error)
    }
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post as any }
          onLike={handleLike}
          onComment={handleComment}
          onSave={handleSave}
        />
      ))}

      {hasMore && (
        <div ref={ref} className="flex justify-center py-8">
          <Button variant="outline" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-slate-500">
          You've reached the end of your feed
        </div>
      )}

      {posts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">No posts yet</div>
          <p className="text-slate-500">Follow some designers to see their posts here!</p>
        </div>
      )}
    </div>
  )
}