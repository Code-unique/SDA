//app/likes/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Heart, User, MessageCircle, Eye, Calendar } from 'lucide-react'

interface LikedItem {
  _id: string
  type: 'post' | 'course' | 'design'
  item: any
  likedAt: string
}

export default function LikesPage() {
  const [likedItems, setLikedItems] = useState<LikedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLikedItems()
  }, [])

  const fetchLikedItems = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users/me/likes')
      if (response.ok) {
        const data = await response.json()
        setLikedItems(data.likedItems)
      }
    } catch (error) {
      console.error('Error fetching liked items:', error)
    } finally {
      setLoading(false)
    }
  }

  const unlikeItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/users/me/likes/${itemId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setLikedItems(prev => prev.filter(item => item._id !== itemId))
      }
    } catch (error) {
      console.error('Error unliking item:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold">Liked Content</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Posts, courses, and designs you've liked
            </p>
          </div>
          <div className="text-sm text-slate-500">
            {likedItems.length} items
          </div>
        </div>

        {likedItems.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                No likes yet
              </h3>
              <p className="text-slate-500 dark:text-slate-500 mb-6">
                Start exploring and like content that inspires you!
              </p>
              <Button className="rounded-2xl">
                Discover Content
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {likedItems.map((likedItem) => (
              <Card key={likedItem._id} className="rounded-2xl hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-xl flex-shrink-0">
                      {likedItem.item.image && (
                        <img
                          src={likedItem.item.image}
                          alt={likedItem.item.title}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">
                            {likedItem.item.title}
                          </h3>
                          <Badge variant="secondary" className="rounded-lg mb-2">
                            {likedItem.type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => unlikeItem(likedItem._id)}
                          className="rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Heart className="w-4 h-4 fill-current" />
                        </Button>
                      </div>

                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                        {likedItem.item.description}
                      </p>

                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>@{likedItem.item.author?.username}</span>
                          </div>
                          {likedItem.item.likes && (
                            <div className="flex items-center space-x-1">
                              <Heart className="w-3 h-3" />
                              <span>{likedItem.item.likes}</span>
                            </div>
                          )}
                          {likedItem.item.comments && (
                            <div className="flex items-center space-x-1">
                              <MessageCircle className="w-3 h-3" />
                              <span>{likedItem.item.comments}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(likedItem.likedAt).toLocaleDateString()}</span>
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