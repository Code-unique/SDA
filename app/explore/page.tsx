'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { PostCard } from '@/components/posts/post-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Search, 
  Grid3X3, 
  List,
  Sparkles,
  SlidersHorizontal,
  X,
  Zap,
  Flame,
  Clock,
  Star,
  TrendingUp,
  Users,
  MapPin,
  Camera,
  Video,
  Crown,
  Leaf,
  ShoppingBag,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Shirt,
  Flower2,
  ScanSearch,
  Rocket,
  Loader2,
  TrendingDown,
  Heart,
  Bookmark,
  Share2,
  MessageCircle,
  Plus
} from 'lucide-react'
import { Post } from '@/types/post'
import { useUser } from '@clerk/nextjs'
import debounce from 'lodash/debounce'
import { useRouter } from 'next/navigation'

type ViewMode = 'grid' | 'list' | 'detailed'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('detailed') // Changed from 'grid' to 'detailed'
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

  const { ref, inView } = useInView()
  const headerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.95])
  const headerBlur = useTransform(scrollY, [0, 100], [0, 8])

  // Categories with rich data - memoized
  const categories = useMemo(() => [
    { 
      id: 'all', 
      name: 'All Designs', 
      color: 'from-rose-500 via-pink-500 to-purple-500',
      bgColor: 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500',
      icon: Sparkles,
      count: 0,
      gradient: 'linear-gradient(135deg, #f43f5e, #ec4899, #a855f7)'
    },
    { 
      id: 'streetwear', 
      name: 'Streetwear', 
      color: 'from-blue-500 via-cyan-500 to-teal-500',
      bgColor: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500',
      icon: Shirt,
      count: 0,
      gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4, #14b8a6)'
    },
    { 
      id: 'haute-couture', 
      name: 'Haute Couture', 
      color: 'from-purple-500 via-pink-500 to-rose-500',
      bgColor: 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500',
      icon: Crown,
      count: 0,
      gradient: 'linear-gradient(135deg, #a855f7, #ec4899, #f43f5e)'
    },
    { 
      id: 'sustainable', 
      name: 'Sustainable', 
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
    { id: 'forsale', name: 'For Sale', icon: ShoppingBag, description: 'Available for purchase', color: 'text-emerald-500' },
    { id: 'ai', name: 'AI Generated', icon: Sparkles, description: 'AI created content', color: 'text-pink-500' },
    { id: 'pro', name: 'Pro Designers', icon: Crown, description: 'From verified professionals', color: 'text-amber-500' },
  ], [])

  // Debounced search for performance
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query)
      setPage(1)
      loadPosts(1, false)
    }, 500),
    []
  )

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
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory !== 'all' && { category: selectedCategory }),
        ...(selectedFilters.length > 0 && { filters: selectedFilters.join(',') })
      })

      const response = await fetch(`/api/posts?${params}`, {
        next: { revalidate: 60 } // ISR for better performance
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
  }, [searchQuery, selectedCategory, selectedFilters, sortBy, loadingMore, isSignedIn, fetchBatchStatuses])

  // Initial load with intersection observer
  useEffect(() => {
    loadPosts(1)
  }, [loadPosts])

  // Load more when in view
  useEffect(() => {
    if (inView && hasMore && !loadingMore) {
      loadPosts(page + 1, true)
    }
  }, [inView, hasMore, loadingMore, page, loadPosts])

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
      // Trigger reload after filter change
      setTimeout(() => loadPosts(1), 100)
      return newFilters
    })
  }, [loadPosts])

  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedFilters([])
    setPage(1)
    loadPosts(1)
  }, [loadPosts])

  // Optimized action handlers with optimistic updates
  const handleLike = useCallback(async (postId: string) => {
    const previousStatus = batchStatusData.likeStatuses[postId]
    
    // Optimistic update
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
      // Rollback on error
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
    
    // Optimistic update
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
      // Rollback on error
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
    
    // Optimistic update
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
      // Rollback on error
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

  // Quick actions bar for mobile - Modified with single post button
  const QuickActions = () => (
    <div className="lg:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex items-center space-x-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl p-2 shadow-2xl shadow-black/20 border border-slate-200/40 dark:border-slate-700/40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setViewMode(prev => prev === 'grid' ? 'detailed' : 'grid')}
          className="rounded-xl w-12 h-12"
        >
          {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
        </Button>
        <Button
          variant="default"
          size="icon"
          onClick={() => router.push('/dashboard/posts/create')}
          className="rounded-xl w-12 h-12 bg-gradient-to-r from-rose-500 to-pink-500 shadow-lg"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/30 to-purple-50/20 dark:from-slate-900 dark:via-rose-900/10 dark:to-purple-900/10">
      {/* Sticky Header */}
      <motion.div
        ref={headerRef}
        style={{
          opacity: headerOpacity,
          backdropFilter: `blur(${headerBlur}px)`,
        }}
        className={`sticky top-0 z-30 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 dark:bg-slate-900/95 shadow-2xl shadow-slate-200/30 dark:shadow-slate-800/30 border-b border-slate-200/60 dark:border-slate-700/60' 
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 py-3">
          {/* Mobile Header */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <motion.h1 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl font-bold bg-gradient-to-r from-slate-900 to-rose-800 dark:from-white dark:to-rose-200 bg-clip-text text-transparent"
                  >
                    Explore
                  </motion.h1>
                  {stats.total > 0 && (
                    <span className="absolute -top-1 -right-6 text-xs font-medium bg-gradient-to-r from-rose-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                      {stats.filtered}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Header - Removed search */}
          <div className="hidden lg:block">
            <div className="text-center max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 mb-6"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Discover Amazing Designs</span>
                </motion.div>

                <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 bg-gradient-to-br from-slate-900 to-rose-800 dark:from-white dark:to-rose-200 bg-clip-text text-transparent">
                  Explore Designs
                </h1>
                
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  Discover inspiring fashion creations from our global community
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 lg:py-6 pb-20 lg:pb-6">
        {/* Mobile Categories Toggle */}
        <div className="lg:hidden mb-4">
          <motion.button
            onClick={() => setShowCategories(!showCategories)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/80"
          >
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-900 dark:text-white">Categories</span>
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white px-2">
                  {categories.find(c => c.id === selectedCategory)?.name}
                </Badge>
              )}
            </div>
            {showCategories ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Categories - Mobile */}
        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden mb-4 overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-2">
                {categories.map((category) => {
                  const IconComponent = category.icon
                  return (
                    <motion.button
                      key={category.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => {
                        setSelectedCategory(category.id)
                        setShowCategories(false)
                        setPage(1)
                        loadPosts(1)
                      }}
                      className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                        selectedCategory === category.id
                          ? `${category.bgColor} text-white shadow-lg`
                          : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                      }`}
                    >
                      <IconComponent className="w-4 h-4 mb-1" />
                      <span className="text-xs font-medium truncate w-full text-center">{category.name}</span>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4"
        >
          {/* Categories - Desktop */}
          <div className="hidden lg:block flex-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white">
                Browse Categories
              </h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 dark:hover:text-white"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filters</span>
                  {selectedFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                      {selectedFilters.length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const IconComponent = category.icon
                return (
                  <motion.button
                    key={category.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedCategory(category.id)
                      setPage(1)
                      loadPosts(1)
                    }}
                    className={`group relative px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 ${
                      selectedCategory === category.id
                        ? `${category.bgColor} text-white shadow-xl`
                        : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm hover:shadow-lg'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 relative z-10" />
                    <span className="relative z-10 text-sm">{category.name}</span>
                    <Badge 
                      variant={selectedCategory === category.id ? "secondary" : "outline"} 
                      className="rounded-full text-xs relative z-10 backdrop-blur-sm"
                    >
                      {category.count}
                    </Badge>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* View Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-between w-full lg:w-auto lg:space-x-4"
          >
            {/* Stats */}
            <div className="lg:hidden text-sm text-slate-600 dark:text-slate-400">
              {stats.filtered > 0 && `${stats.filtered} designs`}
            </div>

            {/* Sort & View */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any)
                    setPage(1)
                    loadPosts(1)
                  }}
                  className="appearance-none rounded-xl border-2 border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-lg"
                >
                  <option value="recent">Recent</option>
                  <option value="popular">Popular</option>
                  <option value="trending">Trending</option>
                </select>
                <TrendingUp className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              </div>

              {/* View Mode */}
              <div className="flex bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl p-1 border-2 border-slate-200/80 dark:border-slate-700/80 shadow-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'detailed'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <Card className="rounded-2xl border-2 border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Advanced Filters
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Refine your search with specific criteria
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedFilters.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAllFilters}
                          className="text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600"
                        >
                          Clear all
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowFilters(false)}
                        className="rounded-xl"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {filters.map((filter) => {
                      const IconComponent = filter.icon
                      const isSelected = selectedFilters.includes(filter.id)
                      return (
                        <motion.button
                          key={filter.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleFilter(filter.id)}
                          className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-rose-500 bg-gradient-to-b from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30 text-rose-700 dark:text-rose-300'
                              : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <IconComponent className={`w-4 h-4 mb-1 ${filter.color}`} />
                          <span className="text-xs font-medium text-center">{filter.name}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters & Results Info */}
        {(searchQuery || selectedCategory !== 'all' || selectedFilters.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 p-4 bg-white/80 dark:bg-slate-800/80 rounded-xl backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                Active filters:
              </span>
              
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white">
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
                  <Badge key={filterId} variant="outline" className="rounded-full">
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
              
              {searchQuery && (
                <Badge variant="outline" className="rounded-full">
                  "{searchQuery}"
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setPage(1)
                      loadPosts(1)
                    }}
                    className="ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Showing <span className="font-semibold text-slate-900 dark:text-white">{posts.length}</span> designs
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600"
              >
                Clear all
              </Button>
            </div>
          </motion.div>
        )}

        {/* Posts Grid */}
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
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            selectedFilters={selectedFilters}
            onClearFilters={clearAllFilters}
            onRefresh={() => loadPosts(1)}
          />
        )}

        {/* Load More */}
        {hasMore && (
          <div ref={ref} className="flex justify-center py-6">
            <Button
              variant="outline"
              onClick={() => loadPosts(page + 1, true)}
              disabled={loadingMore}
              className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-slate-50 dark:hover:bg-slate-700/80"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More Designs'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Post Creation Button - Desktop */}
      <div className="hidden lg:block fixed bottom-8 right-8 z-50">
        <Button
          onClick={() => router.push('/dashboard/posts/create')}
          className="rounded-full w-14 h-14 bg-gradient-to-r from-rose-500 to-pink-500 shadow-2xl shadow-rose-500/40 hover:from-rose-600 hover:to-pink-600"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Quick Actions for Mobile */}
      <QuickActions />
    </div>
  )
}

// Optimized Loading Grid Component
function LoadingGrid({ viewMode }: { viewMode: ViewMode }) {
  const gridClass = viewMode === 'grid' 
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    : "space-y-4"

  return (
    <div className={gridClass}>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200/80 dark:border-slate-700/80 overflow-hidden"
        >
          <div className="aspect-square bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="space-y-1 flex-1">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Optimized Posts Grid Component
function PostsGrid({ posts, viewMode, batchStatusData, ...props }: any) {
  const gridClass = useMemo(() => {
    if (viewMode === 'grid') return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    if (viewMode === 'detailed') return "space-y-4"
    return "grid grid-cols-1 gap-4"
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
            staggerChildren: 0.05
          }
        }
      }}
      className={gridClass}
    >
      <AnimatePresence>
        {posts.map((post: Post, index: number) => (
          <motion.div
            key={post._id}
            variants={{
              hidden: { y: 20, opacity: 0 },
              visible: {
                y: 0,
                opacity: 1
              }
            }}
            layout
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={viewMode === 'detailed' ? 'w-full' : undefined}
          >
            <PostCard
              post={post}
              viewMode={viewMode}
              batchStatusData={batchStatusData}
              {...props}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

// Enhanced Empty State Component
function EmptyState({ searchQuery, selectedCategory, selectedFilters, onClearFilters, onRefresh }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <Card className="rounded-2xl border-2 border-dashed border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm max-w-md mx-auto">
        <CardContent className="p-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <ScanSearch className="w-10 h-10 text-rose-400" />
          </motion.div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            No designs found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
            {searchQuery || selectedCategory !== 'all' || selectedFilters.length > 0
              ? 'Try adjusting your search or filters to see more results.' 
              : 'Be the first to share your fashion creations!'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {(searchQuery || selectedCategory !== 'all' || selectedFilters.length > 0) && (
              <Button
                onClick={onClearFilters}
                className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/25 text-sm py-2"
              >
                Clear all filters
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onRefresh}
              className="rounded-xl text-sm py-2"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}