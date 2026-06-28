//app/saved/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bookmark, User, Image, RefreshCw } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

interface SavedItem {
  _id: string
  itemType: 'post' | 'course'
  itemId: string
  item: any
  savedAt: string
}

export default function SavedPage() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSavedItems()
  }, [])

  const fetchSavedItems = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('=== FETCHING SAVED ITEMS ===')
      const response = await fetch('/api/users/me/saved')
      
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response text:', errorText)
        throw new Error(`API Error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('=== API RESPONSE DATA ===')
      console.log('Full response:', data)
      
      if (data.savedItems) {
        console.log('Number of saved items:', data.savedItems.length)
        
        if (data.savedItems.length > 0) {
          console.log('First item details:')
          console.log('  - Item type:', data.savedItems[0].itemType)
          console.log('  - Has item data?', !!data.savedItems[0].item)
          console.log('  - Item data keys:', data.savedItems[0].item ? Object.keys(data.savedItems[0].item) : 'No item data')
          console.log('  - Complete first item:', JSON.stringify(data.savedItems[0], null, 2))
        }
      } else {
        console.log('No savedItems property in response')
      }
      
      setSavedItems(data.savedItems || [])
      
    } catch (error: any) {
      console.error('=== FETCH ERROR ===', error)
      setError(error.message || 'Failed to load saved items')
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
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unsave')
      }
    } catch (error: any) {
      console.error('Error unsaving item:', error)
      alert(`Error: ${error.message}`)
    }
  }

  const getDisplayInfo = (item: any, itemType: string) => {
    if (!item) {
      return {
        title: 'Content not found',
        description: 'This content may have been deleted',
        authorName: 'unknown',
        imageUrl: null
      }
    }

    let title = 'Untitled'
    let description = 'No description available'
    let authorName = 'unknown'
    let imageUrl = null

    if (itemType === 'post') {
      // Handle post data structure
      title = `Post by ${item.author?.username || item.author?.firstName || 'User'}`
      description = item.caption || 'No caption'
      authorName = item.author?.username || item.author?.firstName || item.authorName || 'unknown'
      
      // Try to get image from media array
      if (item.media && item.media.length > 0) {
        imageUrl = item.media[0].url || item.media[0].thumbnail
      } else {
        imageUrl = item.image || item.thumbnail
      }
    } else if (itemType === 'course') {
      // Handle course data structure
      title = item.title || 'Untitled Course'
      description = item.description || 'No description'
      authorName = item.instructor?.username || item.instructor?.firstName || 'unknown'
      imageUrl = item.thumbnail || item.image
    }

    return { title, description, authorName, imageUrl }
  }

  const getItemTypeDisplay = (itemType: string) => {
    if (itemType === 'post') return 'Post'
    if (itemType === 'course') return 'Course'
    return itemType
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mb-4"></div>
        <p className="text-slate-600">Loading saved items...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-8">
        

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold">Saved Items</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Your bookmarked content
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savedItems.length > 0 && (
              <div className="text-sm text-slate-500">
                {savedItems.length} item{savedItems.length !== 1 ? 's' : ''}
              </div>
            )}
            <Button 
              variant="outline" 
              className="rounded-2xl"
              onClick={fetchSavedItems}
            >
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
            <p className="text-red-600 dark:text-red-400 font-medium">Error: {error}</p>
            <Button 
              onClick={fetchSavedItems} 
              variant="outline" 
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {savedItems.length === 0 ? (
          <Card className="rounded-2xl max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Bookmark className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                No saved items yet
              </h3>
              <p className="text-slate-500 dark:text-slate-500 mb-6">
                When you save posts or courses, they will appear here.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button className="rounded-2xl">
                  Browse Posts
                </Button>
                <Button variant="outline" className="rounded-2xl">
                  Explore Courses
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="text-slate-600 dark:text-slate-400">
                  Saved items • Sorted by recent
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedItems.map((savedItem) => {
                const displayInfo = getDisplayInfo(savedItem.item, savedItem.itemType)
                
                return (
                  <Card key={savedItem._id} className="rounded-2xl overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
                    <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative overflow-hidden">
                      {displayInfo.imageUrl ? (
                        <img
                          src={displayInfo.imageUrl}
                          alt={displayInfo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4">
                          {savedItem.itemType === 'post' ? (
                            <>
                              <div className="w-12 h-12 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center mb-3">
                                <Bookmark className="w-6 h-6 text-slate-500" />
                              </div>
                              <span className="text-slate-500 text-sm text-center">
                                Post preview
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-3">
                                <Bookmark className="w-6 h-6 text-rose-500" />
                              </div>
                              <span className="text-slate-500 text-sm text-center">
                                Course preview
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      
                      <div className="absolute top-2 right-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => unsaveItem(savedItem._id)}
                          className="rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 backdrop-blur-sm transition-all hover:scale-105"
                          title="Remove from saved"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </Button>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="rounded-lg font-medium">
                          {getItemTypeDisplay(savedItem.itemType)}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                        {displayInfo.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2 min-h-[40px]">
                        {displayInfo.description}
                      </p>
                      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center space-x-1 min-w-0">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">@{displayInfo.authorName}</span>
                        </div>
                        <span className="text-xs whitespace-nowrap flex-shrink-0">
                          {formatDate(savedItem.savedAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}