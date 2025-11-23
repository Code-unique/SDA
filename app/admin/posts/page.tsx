// app/admin/posts/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Filter, MoreHorizontal, Eye, EyeOff, Trash2, User } from 'lucide-react'
import Image from 'next/image'

interface Post {
  _id: string
  author: {
    username: string
    firstName: string
    lastName: string
    avatar: string
  }
  caption: string
  media: Array<{ url: string }>
  likes: string[]
  comments: any[]
  isPublic: boolean
  createdAt: string
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      const response = await fetch('/api/admin/posts')
      const data = await response.json()
      if (response.ok) {
        setPosts(data.posts)
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePostVisibility = async (postId: string, currentVisibility: boolean) => {
    try {
      const response = await fetch(`/api/admin/posts/${postId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic: !currentVisibility }),
      })

      if (response.ok) {
        setPosts(posts.map(post => 
          post._id === postId ? { ...post, isPublic: !currentVisibility } : post
        ))
      }
    } catch (error) {
      console.error('Error updating post visibility:', error)
    }
  }

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const response = await fetch(`/api/admin/posts/${postId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPosts(posts.filter(post => post._id !== postId))
      }
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const filteredPosts = posts.filter(post =>
    post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.author.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${post.author.firstName} ${post.author.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

      {/* Search and Filters */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search posts by content or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl"
              />
            </div>
            <Button variant="outline" className="rounded-2xl">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Posts ({filteredPosts.length})</CardTitle>
          <CardDescription>
            All posts on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <div key={post._id} className="flex items-start justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Post media preview */}
                  <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    {post.media[0] ? (
                      <img
                        src={post.media[0].url}
                        alt="Post preview"
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <Image src="/placeholder.png" width={24} height={24} className="w-6 h-6" alt="" />

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
                    
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span>{post.likes.length} likes</span>
                      <span>{post.comments.length} comments</span>
                      <span className={`px-2 py-1 rounded-full ${
                        post.isPublic 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {post.isPublic ? 'Public' : 'Hidden'}
                      </span>
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
        </CardContent>
      </Card>
    </div>
  )
}