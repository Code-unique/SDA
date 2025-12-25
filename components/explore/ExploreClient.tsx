// app/explore/page.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { EnhancedPostCard } from '@/components/posts/enhanced-post-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  Video, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Columns3, 
  Grid3x3,
  Hash,
  TrendingUp,
  Sparkles,
  Flame,
  Zap,
  BarChart3,
  TrendingUp as TrendingIcon,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Post as PostType, User } from '@/types/post'

interface PostApiResponse {
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
  media: Array<{ type: 'image' | 'video'; url: string; thumbnail?: string }>
  caption: string
  hashtags: string[]
  likesCount: number
  savesCount: number
  commentsCount: number
  createdAt: string
  containsVideo: boolean
  views?: number
  category?: string
  location?: string
  isSponsored?: boolean
  isFeatured?: boolean
  availableForSale?: boolean
  price?: number
  currency?: string
  shares?: number
  engagement?: number
  aiGenerated?: boolean
  isPublic?: boolean
  tags?: string[]
}

interface TrendingHashtag {
  tag: string
  count: number
  trendScore?: number
  lastUsed?: string
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
  const observerTarget = useRef<HTMLDivElement>(null)

  const [posts, setPosts] = useState<PostApiResponse[]>([])
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'masonry' | 'grid'>('masonry')
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
  
  const [showTrendingHashtags, setShowTrendingHashtags] = useState(false)
  const [showSearchFilters, setShowSearchFilters] = useState(false)

  // Use refs for values that shouldn't trigger re-renders
  const currentFilters = useRef({
    searchQuery,
    mediaFilter,
    sortBy,
    selectedHashtag,
    viewMode
  })

  // Update ref when values change
  useEffect(() => {
    currentFilters.current = {
      searchQuery,
      mediaFilter,
      sortBy,
      selectedHashtag,
      viewMode
    }
  }, [searchQuery, mediaFilter, sortBy, selectedHashtag, viewMode])

  // Fetch trending hashtags
  const fetchTrendingHashtags = useCallback(async () => {
    try {
      setLoadingTrends(true)
      const response = await fetch('/api/hashtags/trending')
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.hashtags) {
          const sortedTrends = data.hashtags
            .sort((a: TrendingHashtag, b: TrendingHashtag) => b.count - a.count)
            .slice(0, 15)
          setTrendingHashtags(sortedTrends)
        }
      }
    } catch (error) {
      console.error('Error fetching trending hashtags:', error)
    } finally {
      setLoadingTrends(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const initializePage = async () => {
      const tag = searchParams.get('tag')
      const type = searchParams.get('type')
      const sort = searchParams.get('sort')
      const query = searchParams.get('search')
      
      if (tag) {
        setSelectedHashtag(tag)
        setSearchQuery(`#${tag}`)
      }
      
      if (type && ['all', 'images', 'videos'].includes(type)) {
        setMediaFilter(type as 'all' | 'images' | 'videos')
      }
      if (sort && ['recent', 'popular', 'trending'].includes(sort)) {
        setSortBy(sort as 'recent' | 'popular' | 'trending')
      }
      if (query && !tag) {
        setSearchQuery(query)
      }
      
      // Load initial posts
      await loadPosts(1, true)
      
      // Fetch trending hashtags
      fetchTrendingHashtags()
    }

    initializePage()
  }, []) // Empty dependency array - runs once on mount

  // Load posts function - now uses refs to avoid dependency issues
  const loadPosts = async (page: number = 1, reset: boolean = false) => {
    if ((loading && !reset) || loadingMore) return

    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const filters = currentFilters.current
      const params = new URLSearchParams({
        page: page.toString(),
        limit: (filters.viewMode === 'grid' ? 24 : 12).toString(),
        type: filters.mediaFilter,
        sort: filters.sortBy
      })
      
      if (filters.searchQuery) params.set('search', filters.searchQuery)
      if (filters.selectedHashtag) params.set('hashtag', filters.selectedHashtag)

      const response = await fetch(`/api/posts/explore?${params}`)
      if (!response.ok) throw new Error('Failed to fetch posts')

      const data = await response.json()
      
      if (data.success) {
        const newPosts = data.posts || []
        
        if (reset || page === 1) {
          setPosts(newPosts)
        } else {
          setPosts(prev => [...prev, ...newPosts])
        }

        setPagination({
          page: data.pagination?.page || 1,
          limit: data.pagination?.limit || 12,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 1,
          hasMore: data.pagination?.hasMore || false
        })
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      toast({ 
        title: "Error", 
        description: "Could not load posts", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPosts(1, true)
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [searchQuery]) // Only depends on searchQuery

  // Effect for other filters
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPosts(1, true)
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [mediaFilter, sortBy, selectedHashtag, viewMode]) // Other filters

  // Infinite scroll
  useEffect(() => {
    if (!observerTarget.current || !pagination.hasMore || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadPosts(pagination.page + 1, false)
        }
      },
      { threshold: 0.5 }
    )

    const currentTarget = observerTarget.current
    observer.observe(currentTarget)

    return () => {
      if (currentTarget) observer.unobserve(currentTarget)
    }
  }, [pagination.hasMore, loadingMore, pagination.page])

  const handleHashtagClick = (tag: string) => {
    const cleanTag = tag.replace('#', '')
    setSelectedHashtag(cleanTag)
    setSearchQuery(`#${cleanTag}`)
    router.push(`/explore?tag=${cleanTag}`)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedHashtag(null)
    setMediaFilter('all')
    setSortBy('trending')
    router.push('/explore')
  }

  const getTrendColor = (index: number) => {
    if (index === 0) return 'bg-gradient-to-r from-amber-500 to-orange-500'
    if (index === 1) return 'bg-gradient-to-r from-rose-500 to-pink-500'
    if (index === 2) return 'bg-gradient-to-r from-purple-500 to-pink-500'
    if (index < 5) return 'bg-gradient-to-r from-blue-500 to-cyan-500'
    if (index < 10) return 'bg-gradient-to-r from-emerald-500 to-teal-500'
    return 'bg-gradient-to-r from-slate-500 to-slate-600'
  }

  const getTrendIcon = (index: number) => {
    if (index === 0) return <Flame className="w-3.5 h-3.5" />
    if (index === 1) return <Zap className="w-3.5 h-3.5" />
    if (index === 2) return <Sparkles className="w-3.5 h-3.5" />
    if (index < 5) return <TrendingUp className="w-3.5 h-3.5" />
    return <Hash className="w-3.5 h-3.5" />
  }

  const getTrendBadge = (index: number) => {
    if (index >= 3) return null
    
    const colors = [
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800'
    ]
    
    const labels = ['#1 Trending', '#2 Hot', '#3 Rising']
    
    return (
      <Badge 
        variant="outline" 
        className={cn("text-xs px-2 py-0.5 rounded-full", colors[index])}
      >
        {labels[index]}
      </Badge>
    )
  }

  // Convert API response to PostType for EnhancedPostCard
  const convertToPostType = (post: PostApiResponse): PostType => {
    const author: User = {
      _id: post.author._id,
      username: post.author.username,
      firstName: post.author.firstName,
      lastName: post.author.lastName,
      avatar: post.author.avatar,
      isVerified: post.author.isVerified || false,
      isPro: post.author.isPro || false,
      email: '', 
      followers: [],
      following: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return {
      _id: post._id,
      author,
      media: post.media,
      caption: post.caption,
      hashtags: post.hashtags,
      likes: Array(post.likesCount || 0).fill(''),
      saves: Array(post.savesCount || 0).fill(''),
      comments: [],
      createdAt: post.createdAt,
      views: post.views || 0,
      category: post.category || '',
      location: post.location || '',
      isSponsored: post.isSponsored || false,
      isFeatured: post.isFeatured || false,
      availableForSale: post.availableForSale || false,
      price: post.price || 0,
      currency: post.currency || 'USD',
      shares: post.shares || 0,
      engagement: post.engagement || 0,
      aiGenerated: post.aiGenerated || false,
      isPublic: post.isPublic || true,
      tags: post.tags || []
    }
  }

  // Render the component
  return (
    <div className="container mx-auto px-4 py-6 min-h-screen">
      {/* Header with View Toggle */}
      <div className="mb-8 flex justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-rose-500 to-purple-500 bg-clip-text text-transparent">
            Explore Designs
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Discover trending content from creative minds worldwide
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'masonry' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('masonry')}
            className="rounded-xl"
          >
            <Columns3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className="rounded-xl"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={() => setShowSearchFilters(!showSearchFilters)}
          variant={showSearchFilters ? "default" : "outline"}
          className="rounded-xl flex items-center gap-2"
        >
          {showSearchFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <Search className="w-4 h-4" />
          {showSearchFilters ? 'Hide Search' : 'Show Search'}
        </Button>
        
        <Button
          onClick={() => setShowTrendingHashtags(!showTrendingHashtags)}
          variant={showTrendingHashtags ? "default" : "outline"}
          className="rounded-xl flex items-center gap-2"
        >
          {showTrendingHashtags ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <TrendingIcon className="w-4 h-4" />
          {showTrendingHashtags ? 'Hide Trends' : 'Show Trends'}
        </Button>
      </div>

      {/* Trending Hashtags Section */}
      {showTrendingHashtags && (
        <Card className="mb-6 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <TrendingIcon className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Trending Hashtags
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchTrendingHashtags}
                disabled={loadingTrends}
                className="h-8 w-8 p-0 rounded-full"
              >
                <RefreshCw className={cn("w-3 h-3", loadingTrends && "animate-spin")} />
              </Button>
            </div>
            
            {loadingTrends ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
              </div>
            ) : trendingHashtags.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {trendingHashtags.slice(0, 3).map((hashtag, index) => (
                    <motion.div
                      key={hashtag.tag}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "p-4 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
                        index === 0 && "bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800",
                        index === 1 && "bg-gradient-to-r from-rose-50/80 to-pink-50/80 dark:from-rose-900/20 dark:to-pink-900/20 border border-rose-200 dark:border-rose-800",
                        index === 2 && "bg-gradient-to-r from-purple-50/80 to-pink-50/80 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800",
                      )}
                      onClick={() => handleHashtagClick(hashtag.tag)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                            getTrendColor(index)
                          )}>
                            {getTrendIcon(index)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-lg text-slate-900 dark:text-white">
                                #{hashtag.tag}
                              </span>
                              {getTrendBadge(index)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {hashtag.count.toLocaleString()} posts
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {hashtag.count.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            posts
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-white/50 dark:bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            index === 0 ? "bg-gradient-to-r from-amber-500 to-orange-500" :
                            index === 1 ? "bg-gradient-to-r from-rose-500 to-pink-500" :
                            "bg-gradient-to-r from-purple-500 to-pink-500"
                          )}
                          style={{ 
                            width: `${Math.min(100, (hashtag.count / (trendingHashtags[0]?.count || 1)) * 100)}%` 
                          }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {trendingHashtags.slice(3, 15).map((hashtag, index) => (
                    <Badge
                      key={hashtag.tag}
                      variant="secondary"
                      className={cn(
                        "cursor-pointer rounded-full transition-all duration-300 hover:scale-105",
                        index < 2 
                          ? "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          : "hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                      )}
                      onClick={() => handleHashtagClick(hashtag.tag)}
                    >
                      <div className="flex items-center space-x-1.5">
                        <Hash className="w-3 h-3" />
                        <span>#{hashtag.tag}</span>
                        <span className="text-xs opacity-70">({hashtag.count})</span>
                      </div>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                <Hash className="w-8 h-8 mx-auto mb-2" />
                <p>No trending hashtags found</p>
              </div>
            )}
            
            {trendingHashtags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full rounded-xl"
                  onClick={() => router.push('/explore/trending')}
                >
                  View All Trending Topics
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      {showSearchFilters && (
        <Card className="mb-6 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search designs, captions, or hashtags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 rounded-2xl h-12 text-base border-2 border-slate-200 dark:border-slate-700 focus:border-rose-500 dark:focus:border-rose-400 transition-colors"
                />
              </div>
              
              <Select value={mediaFilter} onValueChange={(value: 'all' | 'images' | 'videos') => setMediaFilter(value)}>
                <SelectTrigger className="w-full md:w-[180px] rounded-2xl h-12">
                  <SelectValue placeholder="Media Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Filter className="w-4 h-4" />
                      <span>All Types</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="images" className="rounded-lg">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4" />
                      <span>Images Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="videos" className="rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Video className="w-4 h-4" />
                      <span>Videos Only</span>
                    </div>
                </SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: 'recent' | 'popular' | 'trending') => setSortBy(value)}>
                <SelectTrigger className="w-full md:w-[180px] rounded-2xl h-12">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trending" className="rounded-lg">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>Trending</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="popular" className="rounded-lg">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Popular</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="recent" className="rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Recent</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || mediaFilter !== 'all' || sortBy !== 'trending') && (
                <Button 
                  variant="ghost" 
                  onClick={clearFilters}
                  className="rounded-2xl h-12"
                >
                  <X className="w-4 h-4 mr-2" /> Clear Filters
                </Button>
              )}
            </div>
            
            <AnimatePresence>
              {(searchQuery || selectedHashtag) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700"
                >
                  <div className="flex flex-wrap gap-2">
                    {selectedHashtag && (
                      <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0 rounded-full px-3 py-1">
                        <Hash className="w-3 h-3 mr-1" />
                        #{selectedHashtag}
                        <button 
                          onClick={() => {
                            setSelectedHashtag(null)
                            setSearchQuery('')
                          }}
                          className="ml-2 hover:opacity-80 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    {searchQuery && !selectedHashtag && (
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        Search: "{searchQuery}"
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="ml-2 hover:opacity-80 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* Posts Count & Info */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-slate-600 dark:text-slate-400">
          {loading ? (
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          ) : (
            <span>
              Showing <span className="font-bold text-slate-900 dark:text-white">{posts.length}</span> of{' '}
              <span className="font-bold text-slate-900 dark:text-white">{pagination.total}</span> designs
            </span>
          )}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          View: <span className="font-medium">{viewMode === 'masonry' ? 'Masonry' : 'Grid'}</span>
        </div>
      </div>

      {/* Posts Grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-20"
          >
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-rose-500 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Loading amazing designs...</p>
            </div>
          </motion.div>
        ) : posts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center py-20 text-slate-500 dark:text-slate-400"
          >
            <div className="w-16 h-16 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">No designs found</h3>
            <p className="mb-4">Try adjusting your search or filters</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowSearchFilters(true)} variant="default" className="rounded-xl">
                Show Search
              </Button>
              <Button onClick={clearFilters} variant="outline" className="rounded-xl">
                Clear All Filters
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="posts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "grid gap-4 transition-all duration-300",
              viewMode === 'masonry' 
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            )}
          >
            {posts.map((post, index) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EnhancedPostCard 
                  post={convertToPostType(post)}
                  viewMode={viewMode} 
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Infinite Scroll Trigger */}
      <div ref={observerTarget} className="h-10 mt-4" />
      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading more designs...</p>
          </div>
        </div>
      )}

      {!loading && !loadingMore && pagination.hasMore && (
        <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400">
          Scroll down to load more
        </div>
      )}
    </div>
  )
}