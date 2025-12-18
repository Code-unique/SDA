'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { PostCard } from '@/components/posts/post-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Sparkles,
  X,
  Flame,
  Clock,
  Star,
  Users,
  Camera,
  Video,
  Crown,
  Leaf,
  ShoppingBag,
  Shirt,
  Flower2,
  ScanSearch,
  Loader2,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  List,
  TrendingUp,
  Tag,
  Compass,
  BookOpen,
  Zap
} from 'lucide-react'
import { Post } from '@/types/post'
import { useUser } from '@clerk/nextjs'
import debounce from 'lodash/debounce'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type ViewMode = 'grid' | 'detailed'

interface BatchStatusData {
  likeStatuses: Record<string, boolean>
  saveStatuses: Record<string, { saved: boolean; savedAt?: string }>
  followStatuses: Record<string, boolean>
}

export default function ExplorePage() {
  const router = useRouter()
  const { user: currentUser, isSignedIn } = useUser()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent')
  const [showFilters, setShowFilters] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [isScrolled, setIsScrolled] = useState(false)
  const [batchStatusData, setBatchStatusData] = useState<BatchStatusData>({
    likeStatuses: {},
    saveStatuses: {},
    followStatuses: {}
  })
  const [stats, setStats] = useState({ total: 0, filtered: 0 })
  const [autoLoadEnabled, setAutoLoadEnabled] = useState(true)

  const { ref, inView } = useInView()
  const headerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.95])
  const headerBlur = useTransform(scrollY, [0, 100], [0, 12])

  // Categories with rich data - memoized
  const categories = useMemo(() => [
    { 
      id: 'all', 
      name: 'All', 
      color: 'from-rose-500 via-pink-500 to-purple-500',
      bgColor: 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500',
      icon: Sparkles,
      count: 0,
      gradient: 'linear-gradient(135deg, #f43f5e, #ec4899, #a855f7)'
    },
    { 
      id: 'streetwear', 
      name: 'Street', 
      color: 'from-blue-500 via-cyan-500 to-teal-500',
      bgColor: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500',
      icon: Shirt,
      count: 0,
      gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4, #14b8a6)'
    },
    { 
      id: 'haute-couture', 
      name: 'Couture', 
      color: 'from-purple-500 via-pink-500 to-rose-500',
      bgColor: 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500',
      icon: Crown,
      count: 0,
      gradient: 'linear-gradient(135deg, #a855f7, #ec4899, #f43f5e)'
    },
    { 
      id: 'sustainable', 
      name: 'Eco', 
      color: 'from-green-500 via-emerald-500 to-teal-500',
      bgColor: 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500',
      icon: Leaf,
      count: 0,
      gradient: 'linear-gradient(135deg, #22c55e, #10b981, #14b8a6)'
    },
    { 
      id: 'vintage', 
      name: 'Vintage', 
      color: 'from-amber-500 via-orange-500 to-red-500',
      bgColor: 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-500',
      icon: Clock,
      count: 0,
      gradient: 'linear-gradient(135deg, #f59e0b, #f97316, #ef4444)'
    },
    { 
      id: 'bridal', 
      name: 'Bridal', 
      color: 'from-rose-300 via-pink-300 to-purple-300',
      bgColor: 'bg-gradient-to-r from-rose-300 via-pink-300 to-purple-300',
      icon: Flower2,
      count: 0,
      gradient: 'linear-gradient(135deg, #fda4af, #f9a8d4, #d8b4fe)'
    }
  ], [])

  // Filters - memoized
  const filters = useMemo(() => [
    { id: 'featured', name: 'Featured', icon: Star, description: 'Curated featured content', color: 'text-yellow-500' },
    { id: 'trending', name: 'Trending', icon: Flame, description: 'Popular right now', color: 'text-orange-500' },
    { id: 'video', name: 'Video', icon: Video, description: 'Video content only', color: 'text-red-500' },
    { id: 'image', name: 'Images', icon: Camera, description: 'Static images only', color: 'text-blue-500' },
    { id: 'collaboration', name: 'Collabs', icon: Users, description: 'Collaborative projects', color: 'text-green-500' },
    { id: 'forsale', name: 'For Sale', icon: ShoppingBag, description: 'Available for purchase', color: 'text-emerald-500' }
  ], [])

  // Optimized batch status fetch with caching
  const fetchBatchStatuses = useCallback(async (postIds: string[], userIds: string[]) => {
    if (postIds.length === 0 && userIds.length === 0) return
    
    try {
      const response = await fetch('/api/batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          postIds: postIds.filter(id => id && typeof id === 'string'),
          userIds: userIds.filter(id => id && typeof id === 'string')
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setBatchStatusData(prev => ({
            ...prev,
            ...data.data
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching batch statuses:', error)
    }
  }, [])

  // Optimized posts loading with caching
  const loadPosts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (loadingMore) return

    const loader = pageNum === 1 ? setLoading : setLoadingMore
    loader(true)

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '12',
        sort: sortBy,
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(selectedFilters.length > 0 && { filters: selectedFilters.join(',') })
      })

      const response = await fetch(`/api/posts?${params}`, {
        next: { revalidate: 60 }
      })
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const data = await response.json()

      if (!data.success || !data.posts) {
        if (!append) setPosts([])
        setHasMore(false)
        setStats({ total: 0, filtered: 0 })
        return
      }

      // Extract post IDs and user IDs for batch status
      const postIds = data.posts.map((post: Post) => post._id)
      const userIds = [...new Set(data.posts.map((post: Post) => post.author._id))]
      
      // Fetch statuses in batch
      if (isSignedIn && postIds.length > 0) {
        fetchBatchStatuses(postIds, userIds as string[])
      }

      if (append) {
        setPosts(prev => [...prev, ...(data.posts || [])])
      } else {
        setPosts(data.posts || [])
      }
      
      setHasMore(data.pagination?.hasNext || false)
      setPage(pageNum)
      setStats({
        total: data.stats?.total || 0,
        filtered: data.posts?.length || 0
      })

    } catch (error) {
      console.error('❌ Error loading posts:', error)
      if (!append) setPosts([])
      setHasMore(false)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [selectedCategory, selectedFilters, sortBy, loadingMore, isSignedIn, fetchBatchStatuses])

  // Manual load more function
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadPosts(page + 1, true)
    }
  }, [loadingMore, hasMore, page, loadPosts])

  // Initial load
  useEffect(() => {
    loadPosts(1)
  }, [loadPosts])

  // Disable auto-load when reaching page end
  useEffect(() => {
    if (inView && hasMore && !loadingMore && autoLoadEnabled) {
      // Don't auto-load - let user click button instead
      // loadPosts(page + 1, true)
    }
  }, [inView, hasMore, loadingMore, page, loadPosts, autoLoadEnabled])

  // Optimized scroll handler
  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 50)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Toggle filter with optimistic updates
  const toggleFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => {
      const newFilters = prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
      setTimeout(() => loadPosts(1), 100)
      return newFilters
    })
  }, [loadPosts])

  const clearAllFilters = useCallback(() => {
    setSelectedCategory('all')
    setSelectedFilters([])
    setPage(1)
    loadPosts(1)
  }, [loadPosts])

  // Action handlers
  const handleLike = useCallback(async (postId: string) => {
    const previousStatus = batchStatusData.likeStatuses[postId]
    
    setBatchStatusData(prev => ({
      ...prev,
      likeStatuses: {
        ...prev.likeStatuses,
        [postId]: !previousStatus
      }
    }))

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      return await response.json()
    } catch (error) {
      setBatchStatusData(prev => ({
        ...prev,
        likeStatuses: {
          ...prev.likeStatuses,
          [postId]: previousStatus
        }
      }))
      console.error('Error liking post:', error)
      throw error
    }
  }, [batchStatusData])

  const handleSave = useCallback(async (postId: string) => {
    const previousStatus = batchStatusData.saveStatuses[postId]
    
    setBatchStatusData(prev => ({
      ...prev,
      saveStatuses: {
        ...prev.saveStatuses,
        [postId]: {
          saved: !(previousStatus?.saved || false),
          savedAt: new Date().toISOString()
        }
      }
    }))

    try {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      return await response.json()
    } catch (error) {
      setBatchStatusData(prev => ({
        ...prev,
        saveStatuses: {
          ...prev.saveStatuses,
          [postId]: previousStatus || { saved: false }
        }
      }))
      console.error('Error saving post:', error)
      throw error
    }
  }, [batchStatusData])

  const handleComment = useCallback(async (postId: string, text: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      return await response.json()
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    }
  }, [])

  const handleFollow = useCallback(async (userId: string) => {
    const previousStatus = batchStatusData.followStatuses[userId]
    
    setBatchStatusData(prev => ({
      ...prev,
      followStatuses: {
        ...prev.followStatuses,
        [userId]: !previousStatus
      }
    }))

    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      return await response.json()
    } catch (error) {
      setBatchStatusData(prev => ({
        ...prev,
        followStatuses: {
          ...prev.followStatuses,
          [userId]: previousStatus
        }
      }))
      console.error('Error following user:', error)
      throw error
    }
  }, [batchStatusData])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/10 dark:from-slate-900 dark:via-slate-950 dark:to-rose-900/5">
      {/* Enhanced Glassmorphism Header */}
      <motion.div
        ref={headerRef}
        style={{
          opacity: headerOpacity,
          backdropFilter: `blur(${headerBlur}px)`,
        }}
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          isScrolled 
            ? "bg-white/80 dark:bg-slate-900/80 shadow-lg shadow-slate-200/20 dark:shadow-slate-800/20 border-b border-slate-200/50 dark:border-slate-800/50" 
            : "bg-transparent"
        )}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Brand */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                  <Compass className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-semibold bg-gradient-to-r from-slate-900 to-rose-800 dark:from-white dark:to-rose-200 bg-clip-text text-transparent">
                  Discover
                </span>
              </div>
            </motion.div>

            {/* Right: Enhanced Controls */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              {/* View Mode Toggle */}
              <div className="flex bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-md transition-all relative",
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={cn(
                    "p-2 rounded-md transition-all relative",
                    viewMode === 'detailed'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Enhanced Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any)
                    setPage(1)
                    loadPosts(1)
                  }}
                  className="appearance-none rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-transparent shadow-sm"
                >
                  <option value="recent">Recent</option>
                  <option value="popular">Popular</option>
                  <option value="trending">Trending</option>
                </select>
                <TrendingUp className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content with Enhanced Spacing */}
      <div className="container mx-auto px-4 py-8 pb-32 lg:pb-8">
        {/* Enhanced Hideable Categories Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6 mb-8"
        >
          {/* Categories Header with Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group"
              >
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20 transition-colors">
                  <Tag className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">Categories</span>
                {showCategories ? (
                  <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                ) : (
                  <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                )}
              </button>
              
              {!showCategories && selectedCategory !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className="bg-gradient-to-r from-rose-500 to-pink-500 text-white px-3 py-1"
                >
                  {categories.find(c => c.id === selectedCategory)?.name}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700"
              >
                {posts.length} designs
              </Badge>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:hover:text-white px-3"
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm">Filters</span>
                {selectedFilters.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-0.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white h-5 w-5 p-0 flex items-center justify-center"
                  >
                    {selectedFilters.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Categories Grid with Enhanced Design */}
          <AnimatePresence>
            {showCategories && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {categories.map((category) => {
                    const IconComponent = category.icon
                    return (
                      <motion.button
                        key={category.id}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedCategory(category.id)
                          setPage(1)
                          loadPosts(1)
                        }}
                        className={cn(
                          "group relative p-4 rounded-xl transition-all duration-300 flex flex-col items-center gap-3",
                          selectedCategory === category.id
                            ? `${category.bgColor} text-white shadow-lg`
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700"
                        )}
                      >
                        <div className={cn(
                          "p-3 rounded-lg transition-all duration-300",
                          selectedCategory === category.id
                            ? "bg-white/20"
                            : "bg-slate-100/50 dark:bg-slate-700/50 group-hover:bg-slate-100 dark:group-hover:bg-slate-700"
                        )}>
                          <IconComponent className={cn(
                            "w-5 h-5 transition-all duration-300",
                            selectedCategory === category.id
                              ? "text-white"
                              : "text-slate-600 dark:text-slate-400 group-hover:text-rose-600"
                          )} />
                        </div>
                        <span className="text-sm font-semibold text-center">
                          {category.name}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Enhanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <Card className="border-0 bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Refine Designs
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Filter by content type and features
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {selectedFilters.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 px-3"
                        >
                          Clear all
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowFilters(false)}
                        className="rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filters.map((filter) => {
                      const IconComponent = filter.icon
                      const isSelected = selectedFilters.includes(filter.id)
                      return (
                        <motion.button
                          key={filter.id}
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleFilter(filter.id)}
                          className={cn(
                            "flex items-center gap-3 p-4 rounded-xl border transition-all duration-300",
                            isSelected
                              ? "border-rose-500 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 text-rose-700 dark:text-rose-300"
                              : "border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-lg transition-all duration-300",
                            isSelected
                              ? "bg-rose-100 dark:bg-rose-900/30"
                              : "bg-slate-100 dark:bg-slate-700"
                          )}>
                            <IconComponent className={cn("w-5 h-5", filter.color)} />
                          </div>
                          <div className="text-left">
                            <span className="font-semibold text-sm">{filter.name}</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {filter.description}
                            </p>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters - Enhanced */}
        {(selectedCategory !== 'all' || selectedFilters.length > 0) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-wrap items-center gap-3 mb-8 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50"
          >
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Active filters:
            </span>
            
            <div className="flex flex-wrap items-center gap-2">
              {selectedCategory !== 'all' && (
                <Badge 
                  variant="secondary" 
                  className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-1.5"
                >
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <button
                    onClick={() => {
                      setSelectedCategory('all')
                      setPage(1)
                      loadPosts(1)
                    }}
                    className="ml-2 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              
              {selectedFilters.map(filterId => {
                const filter = filters.find(f => f.id === filterId)
                return (
                  <Badge key={filterId} variant="outline" className="rounded-full px-4 py-1.5">
                    {filter?.name}
                    <button
                      onClick={() => toggleFilter(filterId)}
                      className="ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Enhanced Posts Grid with Beautiful Loading */}
        {loading ? (
          <LoadingGrid viewMode={viewMode} />
        ) : posts.length > 0 ? (
          <PostsGrid 
            posts={posts} 
            viewMode={viewMode}
            batchStatusData={batchStatusData}
            currentUserId={currentUser?.id}
            onLike={handleLike}
            onSave={handleSave}
            onComment={handleComment}
            onFollow={handleFollow}
          />
        ) : (
          <EmptyState 
            selectedCategory={selectedCategory}
            selectedFilters={selectedFilters}
            onClearFilters={clearAllFilters}
            onRefresh={() => loadPosts(1)}
          />
        )}

        {/* Enhanced Load More Button - Manual Only */}
        {hasMore && (
          <div className="flex justify-center py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="text-center"
            >
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg shadow-rose-500/25 px-8 py-6 text-base"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Loading More Designs...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-3" />
                    Load More Designs
                  </>
                )}
              </Button>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                Showing {posts.length} of {stats.total} designs
              </p>
            </motion.div>
          </div>
        )}

        {/* End of Content Indicator */}
        {!hasMore && posts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <div className="h-px w-20 bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-600" />
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">You've reached the end</span>
              <Sparkles className="w-5 h-5" />
              <div className="h-px w-20 bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-600" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Enhanced Loading Grid with Beautiful Skeletons
function LoadingGrid({ viewMode }: { viewMode: ViewMode }) {
  const gridClass = viewMode === 'grid' 
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    : "space-y-6"

  return (
    <div className={gridClass}>
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg"
        >
          <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 animate-pulse" />
          <div className="p-5 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded animate-pulse w-3/4" />
                <div className="h-2 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded animate-pulse w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded animate-pulse w-full" />
              <div className="h-3 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded animate-pulse w-2/3" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="h-8 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded animate-pulse w-20" />
              <div className="h-8 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded animate-pulse w-20" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Enhanced Posts Grid Component
function PostsGrid({ posts, viewMode, batchStatusData, ...props }: any) {
  const gridClass = useMemo(() => {
    if (viewMode === 'grid') return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    if (viewMode === 'detailed') return "space-y-6"
    return "grid grid-cols-1 gap-6"
  }, [viewMode])

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.03
          }
        }
      }}
      className={gridClass}
    >
      {posts.map((post: Post, index: number) => (
        <motion.div
          key={post._id}
          variants={{
            hidden: { y: 20, opacity: 0, scale: 0.95 },
            visible: {
              y: 0,
              opacity: 1,
              scale: 1
            }
          }}
          layout
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, type: "spring" }}
          whileHover={{ y: -4 }}
          className={cn(
            "transition-transform duration-300",
            viewMode === 'detailed' ? 'w-full' : undefined
          )}
        >
          <PostCard
            post={post}
            viewMode={viewMode}
            batchStatusData={batchStatusData}
            {...props}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

// Enhanced Empty State Component
function EmptyState({ selectedCategory, selectedFilters, onClearFilters, onRefresh }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 bg-gradient-to-br from-rose-100/50 via-pink-100/50 to-purple-100/50 dark:from-rose-900/10 dark:via-pink-900/10 dark:to-purple-900/10 rounded-3xl flex items-center justify-center">
          <ScanSearch className="w-12 h-12 text-rose-400" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-pink-500/10 rounded-3xl blur-xl" />
      </motion.div>
      
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">
        No designs found
      </h3>
      <p className="text-slate-600 dark:text-slate-400 mb-8 text-center max-w-md">
        {selectedCategory !== 'all' || selectedFilters.length > 0
          ? 'Try adjusting your filters or explore different categories.' 
          : 'Be the first to create something amazing!'
        }
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {(selectedCategory !== 'all' || selectedFilters.length > 0) && (
          <Button
            onClick={onClearFilters}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg shadow-rose-500/25 px-6"
          >
            Clear all filters
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onRefresh}
          className="rounded-xl border-2 border-slate-200 dark:border-slate-700 px-6"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </motion.div>
  )
}