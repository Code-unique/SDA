'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { EnhancedPostCard } from '@/components/posts/enhanced-post-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter, 
  Grid3x3, 
  List, 
  TrendingUp, 
  Clock, 
  Video, 
  Image as ImageIcon,
  Hash,
  X,
  Loader2,
  LayoutGrid,
  Columns3
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

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
  comments: any[]
  createdAt: string
  mediaCount: number
  containsVideo: boolean
  totalDuration?: number
  engagement?: number
  views?: number
}

interface Hashtag {
  tag: string
  count: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
  hasMore: boolean
}

export default function ExplorePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const [posts, setPosts] = useState<Post[]>([])
  const [hashtags, setHashtags] = useState<Hashtag[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'masonry' | 'grid'>('masonry') // Changed default to masonry
  const [mediaFilter, setMediaFilter] = useState<'all' | 'images' | 'videos'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('trending')
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    total: 0,
    pages: 1,
    hasMore: false
  })
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>()

  // Initialize from URL params
  useEffect(() => {
    const tag = searchParams.get('tag')
    const type = searchParams.get('type')
    const sort = searchParams.get('sort')
    
    if (tag) setSelectedHashtag(tag)
    if (type && ['all', 'images', 'videos'].includes(type)) setMediaFilter(type as any)
    if (sort && ['recent', 'popular', 'trending'].includes(sort)) setSortBy(sort as any)
  }, [searchParams])

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout)

    const timeout = setTimeout(() => {
      loadPosts(1, true)
    }, 500)

    setSearchTimeout(timeout)

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [searchQuery])

  // Load posts
  const loadPosts = useCallback(async (page: number = 1, reset: boolean = false) => {
    if (loading && !reset) return

    if (reset) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: (viewMode === 'grid' ? 24 : 12).toString(),
        type: mediaFilter,
        sort: sortBy
      })
      if (selectedHashtag) params.set('hashtag', selectedHashtag)
      if (searchQuery) params.set('search', searchQuery)

      const response = await fetch(`/api/posts/explore?${params}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

      const data = await response.json()
      if (data.success) {
        if (reset || page === 1) setPosts(data.posts || [])
        else setPosts(prev => [...prev, ...(data.posts || [])])

        setPagination({
          page: data.pagination?.page || 1,
          limit: data.pagination?.limit || 12,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 1,
          hasMore: data.pagination?.page < data.pagination?.pages
        })
      } else {
        toast({
          title: "Error loading posts",
          description: data.error || "Please try again later",
          variant: "destructive"
        })
        setPosts([])
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      toast({
        title: "Error loading posts",
        description: "Please try again later",
        variant: "destructive"
      })
      setPosts([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [mediaFilter, sortBy, selectedHashtag, searchQuery, viewMode, toast])

  // Load trending hashtags
  const loadHashtags = async () => {
    try {
      const response = await fetch('/api/hashtags/trending')
      const data = await response.json()
      if (response.ok && data.success) setHashtags(data.hashtags || [])
    } catch (error) {
      console.error('Error loading hashtags:', error)
    }
  }

  // Load initial data
  useEffect(() => {
    loadPosts(1, true)
    loadHashtags()
  }, [mediaFilter, sortBy, selectedHashtag, viewMode, loadPosts])

  const handleHashtagClick = (tag: string) => {
    const newTag = tag === selectedHashtag ? null : tag
    setSelectedHashtag(newTag)
    updateUrlParams(newTag, mediaFilter, sortBy)
  }

  const handleMediaFilterChange = (value: 'all' | 'images' | 'videos') => {
    setMediaFilter(value)
    updateUrlParams(selectedHashtag, value, sortBy)
  }

  const handleSortByChange = (value: 'recent' | 'popular' | 'trending') => {
    setSortBy(value)
    updateUrlParams(selectedHashtag, mediaFilter, value)
  }

  const updateUrlParams = (tag: string | null, type: string, sort: string) => {
    const params = new URLSearchParams()
    if (tag) params.set('tag', tag)
    if (type !== 'all') params.set('type', type)
    if (sort !== 'trending') params.set('sort', sort)
    const queryString = params.toString()
    router.push(queryString ? `/explore?${queryString}` : '/explore', { scroll: false })
  }

  const clearFilters = () => {
    setSelectedHashtag(null)
    setMediaFilter('all')
    setSortBy('trending')
    setSearchQuery('')
    router.push('/explore', { scroll: false })
  }

  const loadMore = () => {
    if (pagination.hasMore && !loadingMore) loadPosts(pagination.page + 1)
  }

  // Render
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Explore</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Discover amazing content from creators around the world
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search posts, creators, or hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'masonry' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('masonry')}
                className="rounded-2xl"
                title="Masonry View (Pinterest-style)"
              >
                <Columns3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="rounded-2xl"
                title="Grid View"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 flex flex-wrap gap-2">
          <Select value={mediaFilter} onValueChange={handleMediaFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Media type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  All Types
                </div>
              </SelectItem>
              <SelectItem value="images">
                <div className="flex items-center">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Images Only
                </div>
              </SelectItem>
              <SelectItem value="videos">
                <div className="flex items-center">
                  <Video className="w-4 h-4 mr-2" />
                  Videos Only
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={handleSortByChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trending">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Trending
                </div>
              </SelectItem>
              <SelectItem value="popular">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Most Popular
                </div>
              </SelectItem>
              <SelectItem value="recent">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Most Recent
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {(selectedHashtag || mediaFilter !== 'all' || sortBy !== 'trending' || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Trending Hashtags */}
      {hashtags.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Hash className="w-4 h-4 mr-2" />
            Trending Hashtags
          </h3>
          <div className="flex flex-wrap gap-2">
            {hashtags.slice(0, 10).map((hashtag) => (
              <Badge
                key={hashtag.tag}
                variant={selectedHashtag === hashtag.tag ? "default" : "outline"}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => handleHashtagClick(hashtag.tag)}
              >
                #{hashtag.tag}
                <span className="ml-1 text-xs opacity-75">({hashtag.count})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Posts Grid/List */}
      {loading ? (
        <div className={cn(
          "grid gap-4",
          viewMode === 'masonry' ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}>
          {Array.from({ length: viewMode === 'grid' ? 12 : 8 }).map((_, i) => (
            <Card key={i} className={cn(
              "animate-pulse mb-4",
              viewMode === 'masonry' ? "break-inside-avoid" : ""
            )}>
              <div className={cn(
                "bg-slate-200 dark:bg-slate-700",
                viewMode === 'masonry' ? "aspect-[4/5]" : "aspect-square"
              )} />
              <CardContent className="p-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No posts found</h3>
          <p className="text-slate-500 dark:text-slate-400">
            {searchQuery 
              ? `No results for "${searchQuery}". Try a different search.` 
              : selectedHashtag
              ? `No posts tagged #${selectedHashtag}.`
              : 'Try changing your filters or search term.'}
          </p>
          {(searchQuery || selectedHashtag) && (
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className={cn(
            "gap-4",
            viewMode === 'masonry' 
              ? "columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5" 
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          )}>
            {posts.map(post => (
              <div 
                key={post._id} 
                className={cn(
                  viewMode === 'masonry' && "break-inside-avoid mb-4"
                )}
              >
                <EnhancedPostCard 
                  post={post as any} 
                  viewMode={viewMode}
                  className={viewMode === 'masonry' ? "mb-4" : ""}
                />
              </div>
            ))}
          </div>

          {pagination.hasMore && (
            <div className="flex justify-center mt-8">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="rounded-2xl">
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : 'Load More'}
              </Button>
            </div>
          )}
        </>
      )}

      {!loading && posts.length > 0 && !pagination.hasMore && (
        <div className="text-center py-8 text-slate-500">
          You've reached the end of results
        </div>
      )}
    </div>
  )
}