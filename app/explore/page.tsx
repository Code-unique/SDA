'use client'

import { useState, useEffect, useRef } from 'react'
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
  Minus,
  ShoppingBag,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Palette,
  Shirt,
  Gem,
  Flower2,
  ScanSearch,
  Rocket,
  Loader2,
  Heart,
  MessageCircle,
  Eye,
  BarChart3
} from 'lucide-react'
import { Post, ApiResponse, PaginatedResponse } from '@/types/post'
import { useUser } from '@clerk/nextjs'

type ViewMode = 'grid' | 'list' | 'detailed'

export default function ExplorePage() {
  const { user: currentUser, isSignedIn } = useUser()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'trending'>('recent')
  const [showFilters, setShowFilters] = useState(false)
  const [showCategories, setShowCategories] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [isScrolled, setIsScrolled] = useState(false)

  const { ref, inView } = useInView()
  const headerRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.95])
  const headerBlur = useTransform(scrollY, [0, 100], [0, 4])

  // Enhanced categories with rich data
  const categories = [
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
  ]

  // Enhanced filters
  const filters = [
    { id: 'featured', name: 'Featured', icon: Star, description: 'Curated featured content', color: 'text-yellow-500' },
    { id: 'trending', name: 'Trending', icon: Flame, description: 'Popular right now', color: 'text-orange-500' },
    { id: 'video', name: 'Video', icon: Video, description: 'Video content only', color: 'text-red-500' },
    { id: 'image', name: 'Images', icon: Camera, description: 'Static images only', color: 'text-blue-500' },
    { id: 'collaboration', name: 'Collabs', icon: Users, description: 'Collaborative projects', color: 'text-green-500' },
    { id: 'forsale', name: 'For Sale', icon: ShoppingBag, description: 'Available for purchase', color: 'text-emerald-500' },
    { id: 'ai', name: 'AI Generated', icon: Sparkles, description: 'AI created content', color: 'text-pink-500' },
    { id: 'pro', name: 'Pro Designers', icon: Crown, description: 'From verified professionals', color: 'text-amber-500' },
  ]

  const loadPosts = async (pageNum: number = 1, append: boolean = false) => {
  if (loadingMore) return

  if (pageNum === 1) {
    setLoading(true)
  } else {
    setLoadingMore(true)
  }

  try {
    const params = new URLSearchParams({
      page: pageNum.toString(),
      limit: '12',
      sort: sortBy,
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory !== 'all' && { category: selectedCategory }),
      ...(selectedFilters.length > 0 && { filters: selectedFilters.join(',') })
    })

    console.log('🔄 Loading posts with params:', Object.fromEntries(params))
    const response = await fetch(`/api/posts?${params}`)
    
    console.log('📡 Response status:', response.status, response.statusText)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('📦 API Response:', data)

    // FIX: Use the actual API response structure
    if (!data.success || !data.posts) {
      console.warn('❌ API returned no posts', {
        success: data.success,
        posts: data.posts
      })
      setPosts(prev => append ? prev : [])
      setHasMore(false)
      return
    }

    // FIX: Use data.posts instead of data.data.items
    console.log('✅ Posts received:', {
      postsCount: data.posts.length,
      hasNext: data.pagination?.hasNext,
      postsSample: data.posts.slice(0, 2)
    })

    if (append) {
      setPosts(prev => [...prev, ...(data.posts || [])])
    } else {
      setPosts(data.posts || [])
    }
    
    setHasMore(data.pagination?.hasNext || false)
    setPage(pageNum)

  } catch (error) {
    console.error('❌ Error loading posts:', error)
    setPosts([])
    setHasMore(false)
  } finally {
    setLoading(false)
    setLoadingMore(false)
  }
}

  useEffect(() => {
    loadPosts(1)
  }, [searchQuery, selectedCategory, selectedFilters, sortBy])

  useEffect(() => {
    if (inView && hasMore && !loadingMore) {
      loadPosts(page + 1, true)
    }
  }, [inView, hasMore, loadingMore, page])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    )
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedFilters([])
  }

  // Action handlers
  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      return await response.json()
    } catch (error) {
      console.error('Error liking post:', error)
      throw error
    }
  }

  const handleSave = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      return await response.json()
    } catch (error) {
      console.error('Error saving post:', error)
      throw error
    }
  }

  const handleComment = async (postId: string, text: string) => {
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
  }

  const handleFollow = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      return await response.json()
    } catch (error) {
      console.error('Error following user:', error)
      throw error
    }
  }

  const handleShare = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      return await response.json()
    } catch (error) {
      console.error('Error sharing post:', error)
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/30 to-purple-50/20 dark:from-slate-900 dark:via-rose-900/10 dark:to-purple-900/10">
      {/* Enhanced Sticky Header */}
      <motion.div
        ref={headerRef}
        style={{
          opacity: headerOpacity,
          backdropFilter: `blur(${headerBlur}px)`,
        }}
        className={`sticky top-0 z-30 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/90 dark:bg-slate-900/90 shadow-2xl shadow-slate-200/20 dark:shadow-slate-800/20 border-b border-slate-200/40 dark:border-slate-700/40' 
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          {/* Mobile Header */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-rose-800 dark:from-white dark:to-rose-200 bg-clip-text text-transparent"
              >
                Explore
              </motion.h1>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => loadPosts(1)}
                  disabled={loading}
                  className="rounded-2xl w-10 h-10"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className="rounded-2xl w-10 h-10"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Mobile Search */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative"
            >
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search designs, designers, hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:ring-2 focus:ring-rose-500"
              />
            </motion.div>
          </div>

          {/* Desktop Header */}
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
                  className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 mb-6"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Discover Amazing Designs</span>
                </motion.div>

                <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6 bg-gradient-to-br from-slate-900 to-rose-800 dark:from-white dark:to-rose-200 bg-clip-text text-transparent">
                  Explore Designs
                </h1>
                
                <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                  Discover inspiring fashion creations from our global community of talented designers
                </p>
                
                {/* Enhanced Search Bar */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="relative max-w-2xl mx-auto"
                >
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search designs, designers, hashtags, styles, materials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 text-lg"
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Mobile Categories Toggle */}
        <div className="lg:hidden mb-6">
          <motion.button
            onClick={() => setShowCategories(!showCategories)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60"
          >
            <span className="font-semibold text-slate-900 dark:text-white">Browse Categories</span>
            {showCategories ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Enhanced Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6"
        >
          {/* Categories - Desktop */}
          <div className="hidden lg:block flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">
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
                    <Badge variant="secondary" className="ml-1 bg-rose-500 text-white">
                      {selectedFilters.length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <AnimatePresence>
                {categories.map((category, index) => {
                  const IconComponent = category.icon
                  return (
                    <motion.button
                      key={category.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`group relative px-6 py-3 rounded-2xl font-medium transition-all duration-500 flex items-center space-x-2 overflow-hidden ${
                        selectedCategory === category.id
                          ? `${category.bgColor} text-white shadow-2xl transform scale-105`
                          : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm hover:shadow-xl'
                      }`}
                    >
                      <IconComponent className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">{category.name}</span>
                      <Badge 
                        variant={selectedCategory === category.id ? "secondary" : "outline"} 
                        className="rounded-full text-xs relative z-10 backdrop-blur-sm"
                      >
                        {category.count}
                      </Badge>
                      
                      {/* Animated shine effect */}
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 ${
                        selectedCategory === category.id ? 'opacity-100' : ''
                      }`}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      </div>
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* View Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center space-x-4 w-full lg:w-auto"
          >
            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none rounded-2xl border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent shadow-lg"
              >
                <option value="recent">Most Recent</option>
                <option value="popular">Most Popular</option>
                <option value="trending">Trending</option>
              </select>
              <TrendingUp className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* View Mode */}
            <div className="flex bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-1 border-2 border-slate-200/60 dark:border-slate-700/60 shadow-lg">
              <button
                onClick={() => setViewMode('detailed')}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  viewMode === 'detailed'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
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
              className="overflow-hidden mb-8"
            >
              <Card className="rounded-3xl border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-6">
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
                        className="rounded-2xl"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {filters.map((filter) => {
                      const IconComponent = filter.icon
                      const isSelected = selectedFilters.includes(filter.id)
                      return (
                        <motion.button
                          key={filter.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleFilter(filter.id)}
                          className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all duration-300 group ${
                            isSelected
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 shadow-lg scale-105'
                              : 'border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                          }`}
                        >
                          <IconComponent className={`w-5 h-5 mb-2 group-hover:scale-110 transition-transform ${filter.color}`} />
                          <span className="text-xs font-medium text-center mb-1">{filter.name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {filter.description}
                          </span>
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
            className="flex flex-wrap items-center justify-between mb-8 p-4 bg-white/50 dark:bg-slate-800/50 rounded-2xl backdrop-blur-sm border border-slate-200/40 dark:border-slate-700/40 gap-3"
          >
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                Active filters:
              </span>
              
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <button
                    onClick={() => setSelectedCategory('all')}
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
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-4">
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
          <LoadingGrid />
        ) : posts.length > 0 ? (
          <PostsGrid 
            posts={posts} 
            viewMode={viewMode}
            currentUserId={currentUser?.id}
            onLike={handleLike}
            onSave={handleSave}
            onComment={handleComment}
            onFollow={handleFollow}
            onShare={handleShare}
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
          <div ref={ref} className="flex justify-center py-8">
            <Button
              variant="outline"
              onClick={() => loadPosts(page + 1, true)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Sub-components
function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-slate-200/60 dark:border-slate-700/60 overflow-hidden"
        >
          <div className="aspect-square bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function PostsGrid({ posts, viewMode, ...props }: any) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
      className={
        viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          : viewMode === 'detailed'
          ? "space-y-6"
          : "grid grid-cols-1 gap-6"
      }
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
            exit="hidden"
            transition={{ duration: 0.5, delay: index * 0.05 }}
          >
            <PostCard
              post={post}
              viewMode={viewMode}
              {...props}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

function EmptyState({ searchQuery, selectedCategory, selectedFilters, onClearFilters, onRefresh }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16"
    >
      <Card className="rounded-3xl border-2 border-dashed border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm max-w-md mx-auto">
        <CardContent className="p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-24 h-24 bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <ScanSearch className="w-12 h-12 text-rose-400" />
          </motion.div>
          <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-3">
            No designs found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {searchQuery || selectedCategory !== 'all' || selectedFilters.length > 0
              ? 'Try adjusting your search or filters to see more results.' 
              : 'Be the first to share your fashion creations!'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {(searchQuery || selectedCategory !== 'all' || selectedFilters.length > 0) && (
              <Button
                onClick={onClearFilters}
                className="rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/25"
              >
                Clear all filters
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onRefresh}
              className="rounded-2xl"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}