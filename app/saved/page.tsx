//app/saved/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bookmark, Heart, MessageCircle, Eye, User } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

interface SavedItem {
  _id: string
  type: 'post' | 'course' | 'design'
  item: any
  savedAt: string
}

export default function SavedPage() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSavedItems()
  }, [])

  const fetchSavedItems = async () => {
    try {
      setLoading(true)
      // This would call your saved items API
      const response = await fetch('/api/users/me/saved')
      if (response.ok) {
        const data = await response.json()
        setSavedItems(data.savedItems)
      }
    } catch (error) {
      console.error('Error fetching saved items:', error)
    } finally {
      setLoading(false)
    }
  }

  const unsaveItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/users/me/saved/${itemId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setSavedItems(prev => prev.filter(item => item._id !== itemId))
      }
    } catch (error) {
      console.error('Error unsaving item:', error)
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
            <h1 className="text-3xl font-serif font-bold">Saved Items</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Your bookmarked content
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="rounded-2xl">
              Filter
            </Button>
          </div>
        </div>

        {savedItems.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <Bookmark className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                No saved items yet
              </h3>
              <p className="text-slate-500 dark:text-slate-500 mb-6">
                Start exploring and save content you love!
              </p>
              <Button className="rounded-2xl">
                Explore Content
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedItems.map((savedItem) => (
              <Card key={savedItem._id} className="rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
                <div className="aspect-square bg-slate-200 dark:bg-slate-700 relative">
                  {savedItem.item?.image && (
  <img
    src={savedItem.item.image}
    alt={savedItem.item?.title || 'Saved item'}
    className="w-full h-full object-cover"
  />
)}

                  <div className="absolute top-2 right-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => unsaveItem(savedItem._id)}
                      className="rounded-xl bg-white/80 hover:bg-white"
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="rounded-lg">
                      {savedItem.type}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                    {savedItem.item?.title || "Untitled"}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                    {savedItem.item?.description || "No description available"}
                  </p>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>@{savedItem.item?.author?.username || "unknown"}</span>
                    </div>
                    <span className="text-xs">
                      {new Date(savedItem.savedAt).toLocaleDateString()}
                    </span>
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