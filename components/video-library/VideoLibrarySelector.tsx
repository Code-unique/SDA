'use client'

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  Filter,
  Check,
  X,
  Video,
  Play,
  HardDrive,
  Users,
  Calendar,
  Globe,
  RefreshCw,
  Grid,
  List,
  CheckCircle,
  Film
} from 'lucide-react'

// Types
interface VideoLibraryItem {
  _id: string;
  title: string;
  description?: string;
  video: {
    key: string;
    url: string;
    size: number;
    type: 'video';
    duration?: number;
    width?: number;
    height?: number;
    originalFileName?: string;
    mimeType?: string;
  };
  categories: string[];
  tags: string[];
  usageCount: number;
  courses: any[];
  uploadDate: string;
  uploadedBy?: any;
  formattedDuration?: string;
  formattedSize?: string;
  isPublic?: boolean;
  metadata?: {
    resolution?: string;
    format?: string;
    bitrate?: number;
    frameRate?: number;
  };
}

interface PaginationData {
  total: number;
  hasNext: boolean;
}

interface VideoLibraryResponse {
  videos: VideoLibraryItem[];
  pagination: PaginationData;
}

interface VideoLibrarySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (video: VideoLibraryItem) => void;
  currentFile?: {
    key?: string;
    url?: string;
  } | null;
  type?: 'lessonVideo' | 'previewVideo';
  moduleIndex?: number;
  chapterIndex?: number;
  lessonIndex?: number;
}

const VideoLibrarySelector = memo(({
  open,
  onOpenChange,
  onSelect,
  currentFile,
  type = 'lessonVideo',
  moduleIndex,
  chapterIndex,
  lessonIndex
}: VideoLibrarySelectorProps) => {
  const [videos, setVideos] = useState<VideoLibraryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoLibraryItem | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [categories, setCategories] = useState<string[]>([])
  const [stats, setStats] = useState({ total: 0, totalSize: 0 })
  const [loadingMore, setLoadingMore] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { getToken } = useAuth()

  // Format helpers
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }
    if (bytes >= 1024) {
      return `${(bytes / (1024)).toFixed(2)} KB`
    }
    return `${bytes} B`
  }, [])

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return ''
    }
  }, [])

  const formatDurationSeconds = useCallback((seconds: number) => {
    if (!seconds) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setVideos([])
      setSearchQuery('')
      setSelectedCategories([])
      setSelectedVideo(null)
      setPage(1)
      setHasMore(true)
      setShowFilters(false)
    }
  }, [open])

  // Fetch videos
  const fetchVideos = useCallback(async (reset = false) => {
    if (!open) return
    
    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
      const currentPage = reset ? 1 : page
      const token = await getToken()
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategories.length > 0 && { categories: selectedCategories.join(',') })
      })
      
      const response = await fetch(`/api/admin/video-library?${params}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch videos')
      }
      
      const data: VideoLibraryResponse = await response.json()
      
      if (reset) {
        setVideos(data.videos || [])
      } else {
        setVideos(prev => [...prev, ...(data.videos || [])])
      }
      
      // Extract unique categories
      const allCategories = new Set<string>()
      data.videos?.forEach((video: VideoLibraryItem) => {
        video.categories?.forEach((cat: string) => allCategories.add(cat))
      })
      setCategories(Array.from(allCategories))
      
      // Calculate stats
      const totalSize = data.videos?.reduce((sum: number, video: VideoLibraryItem) => 
        sum + (video.video?.size || 0), 0) || 0
      
      setStats({
        total: data.pagination?.total || 0,
        totalSize
      })
      
      setHasMore(data.pagination?.hasNext || false)
      setPage(currentPage + 1)
      
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [open, searchQuery, selectedCategories, page, getToken])

  // Initial load
  useEffect(() => {
    if (open) {
      fetchVideos(true)
    }
  }, [open, fetchVideos])

  // Handle search with debounce
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        fetchVideos(true)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchQuery, open, fetchVideos])

  // Handle filter changes
  useEffect(() => {
    if (open) {
      fetchVideos(true)
    }
  }, [selectedCategories, open, fetchVideos])

  // Infinite scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loading || loadingMore || !hasMore) return
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      fetchVideos(false)
    }
  }, [loading, loadingMore, hasMore, fetchVideos])

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll)
      return () => scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Filter handlers
  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }, [])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedCategories([])
    setSelectedVideo(null)
    setPage(1)
    fetchVideos(true)
  }, [fetchVideos])

  // Video selection
  const handleSelect = useCallback((video: VideoLibraryItem) => {
    setSelectedVideo(video)
  }, [])

  const handleConfirm = useCallback(() => {
    if (selectedVideo) {
      onSelect(selectedVideo)
      onOpenChange(false)
    }
  }, [selectedVideo, onSelect, onOpenChange])

  // Check if video is current
  const isCurrentVideo = useCallback((video: VideoLibraryItem) => {
    if (!currentFile || !video.video) return false
    return video.video.url === currentFile.url || video.video.key === currentFile.key
  }, [currentFile])

  // Close handler
  const handleClose = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  // Video Card Component
  const VideoCard = memo(({ 
    video, 
    isSelected, 
    isCurrent 
  }: { 
    video: VideoLibraryItem
    isSelected: boolean
    isCurrent: boolean
  }) => {
    const resolution = video.metadata?.resolution || ''
    
    return (
      <button
        type="button"
        className={`
          relative w-full text-left overflow-hidden rounded-lg md:rounded-xl border transition-all duration-200 
          active:scale-[0.98] md:hover:shadow-lg md:hover:-translate-y-0.5 cursor-pointer group
          ${isSelected 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' 
            : isCurrent
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }
        `}
        onClick={() => handleSelect(video)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Play className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
          
          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
            {formatDurationSeconds(video.video?.duration || 0)}
          </div>
          
          {/* Resolution Badge */}
          {resolution && (
            <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
              {resolution.includes('1080') ? 'HD' : resolution.includes('720') ? 'HD' : resolution}
            </div>
          )}
          
          {/* Selection Indicator */}
          {isSelected && (
            <div className="absolute top-2 right-2">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
              </div>
            </div>
          )}
          
          {/* Current Indicator */}
          {isCurrent && (
            <div className="absolute top-2 left-2">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 md:p-4">
          {/* Title */}
          <h4 className="font-semibold text-slate-900 dark:text-white text-sm md:text-base line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {video.title}
          </h4>
          
          {/* Description */}
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
            {video.description || video.video?.originalFileName || 'No description'}
          </p>
          
          {/* Metadata */}
          <div className="space-y-2">
            {/* Stats */}
            <div className="flex items-center justify-between text-xs md:text-sm">
              <div className="flex items-center gap-2 md:gap-4">
                <span className="flex items-center gap-1 md:gap-1.5 text-slate-600 dark:text-slate-400">
                  <HardDrive className="w-3 h-3 md:w-4 md:h-4" />
                  {formatFileSize(video.video?.size || 0)}
                </span>
                <span className="flex items-center gap-1 md:gap-1.5 text-slate-600 dark:text-slate-400">
                  <Users className="w-3 h-3 md:w-4 md:h-4" />
                  {video.usageCount}
                </span>
              </div>
              {video.isPublic && (
                <Globe className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
              )}
            </div>
            
            {/* Categories */}
            {video.categories?.length > 0 && (
              <div className="flex flex-wrap gap-1 md:gap-1.5">
                {video.categories.slice(0, 2).map(category => (
                  <span 
                    key={category}
                    className="px-2 py-0.5 md:px-2.5 md:py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs"
                  >
                    {category}
                  </span>
                ))}
                {video.categories.length > 2 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 px-1">
                    +{video.categories.length - 2}
                  </span>
                )}
              </div>
            )}
            
            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1 md:gap-1.5">
                <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" />
                {formatDate(video.uploadDate)}
              </span>
              {video.uploadedBy && (
                <span className="text-xs truncate max-w-[80px] md:max-w-none">
                  {video.uploadedBy.firstName}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  })
  VideoCard.displayName = 'VideoCard'

  // Empty state
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] px-4">
      <div className="p-3 md:p-4 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 w-12 h-12 md:w-16 md:h-16 mb-4 flex items-center justify-center">
        <Video className="w-6 h-6 md:w-8 md:h-8 text-slate-400" />
      </div>
      <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white mb-2 text-center">
        No videos found
      </h3>
      <p className="text-slate-600 dark:text-slate-400 text-center text-sm max-w-sm">
        {searchQuery || selectedCategories.length > 0
          ? 'Try adjusting your search or filters'
          : 'Upload videos to get started'}
      </p>
    </div>
  )

  // Loading skeleton
  const SkeletonGrid = () => (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-lg mb-3"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded mb-2"></div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  )

  // Dialog description for accessibility
  const dialogDescription = `Select a video from your library. ${stats.total} videos available. Use search and filters to find the right video.`

  return (
    <>
      {/* Main Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="
            max-w-none w-full h-full m-0 p-0 rounded-none
            sm:max-w-[95vw] sm:max-h-[90vh] sm:rounded-xl
            md:max-w-[90vw] md:max-h-[85vh]
            lg:max-w-[85vw]
            xl:max-w-[80vw]
            flex flex-col overflow-hidden
          "
          aria-describedby="video-library-description"
        >
          <DialogDescription id="video-library-description" className="sr-only">
            {dialogDescription}
          </DialogDescription>

          {/* Header - Mobile */}
          <div className="block sm:hidden sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Video Library
                </DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-10 w-10"
                aria-label="Close video library"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Mobile Search */}
            <div className="px-4 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-xl text-base"
                  aria-label="Search videos"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Mobile Stats & Filters */}
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {stats.total} videos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(true)}
                    className="h-8 px-3"
                    aria-label="Open filters"
                  >
                    <Filter className="w-4 h-4 mr-1.5" />
                    Filters
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchVideos(true)}
                    className="h-8 px-3"
                    aria-label="Refresh videos"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Header - Desktop */}
          <div className="hidden sm:block sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                    Video Library
                  </DialogTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Select a video for your {type === 'previewVideo' ? 'preview' : 'lesson'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-10 w-10"
                aria-label="Close video library"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="px-6 pb-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input
                      placeholder="Search videos by title, description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 rounded-xl text-base"
                      aria-label="Search videos"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10"
                        aria-label="Clear search"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="h-12 px-4"
                    aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
                  >
                    {viewMode === 'grid' ? (
                      <List className="w-5 h-5" />
                    ) : (
                      <Grid className="w-5 h-5" />
                    )}
                    <span className="ml-2 hidden lg:inline">
                      {viewMode === 'grid' ? 'List View' : 'Grid View'}
                    </span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="h-12 px-4"
                    aria-label="Clear all filters"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {stats.total} videos • {formatFileSize(stats.totalSize)}
                </div>
                <div className="flex items-center gap-2">
                  {categories.slice(0, 3).map(category => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      onClick={() => toggleCategory(category)}
                      className="cursor-pointer px-3 py-1"
                      aria-label={`${selectedCategories.includes(category) ? 'Remove' : 'Add'} ${category} filter`}
                    >
                      {category}
                    </Badge>
                  ))}
                  {categories.length > 3 && (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      +{categories.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex md:w-64 border-r border-slate-200 dark:border-slate-800 overflow-y-auto flex-shrink-0">
              <div className="w-full p-6">
                {/* Categories */}
                <div className="mb-8">
                  <h4 className="font-medium text-sm mb-4 text-slate-700 dark:text-slate-300">
                    Categories
                  </h4>
                  <div className="space-y-2">
                    {categories.map(category => (
                      <label
                        key={category}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        htmlFor={`category-${category}`}
                      >
                        <input
                          id={`category-${category}`}
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => toggleCategory(category)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
                          aria-label={`${selectedCategories.includes(category) ? 'Deselect' : 'Select'} ${category}`}
                        />
                        <span className="text-sm flex-1">{category}</span>
                        <span className="text-xs text-slate-500">
                          {videos.filter(v => v.categories?.includes(category)).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* View Mode */}
                <div>
                  <h4 className="font-medium text-sm mb-4 text-slate-700 dark:text-slate-300">
                    View Mode
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="flex-1"
                      aria-label="Grid view"
                    >
                      Grid
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="flex-1"
                      aria-label="List view"
                    >
                      List
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Videos Container */}
            <div className="flex-1 flex flex-col min-h-0">
              <ScrollArea 
                className="flex-1" 
                ref={scrollRef}
              >
                <div className="p-4 sm:p-6">
                  {loading && videos.length === 0 ? (
                    <SkeletonGrid />
                  ) : videos.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <>
                      {/* Grid View */}
                      {viewMode === 'grid' && (
                        <div 
                          className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6"
                          role="list"
                          aria-label="Video library grid"
                        >
                          {videos.map((video) => {
                            const isSelected = selectedVideo?._id === video._id
                            const isCurrent = isCurrentVideo(video)
                            
                            return (
                              <div key={video._id} className="w-full" role="listitem">
                                <VideoCard
                                  video={video}
                                  isSelected={isSelected}
                                  isCurrent={isCurrent}
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* List View */}
                      {viewMode === 'list' && (
                        <div 
                          className="space-y-3 md:space-y-4"
                          role="list"
                          aria-label="Video library list"
                        >
                          {videos.map((video) => {
                            const isSelected = selectedVideo?._id === video._id
                            const isCurrent = isCurrentVideo(video)
                            
                            return (
                              <button
                                key={video._id}
                                type="button"
                                className={`
                                  w-full flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-lg md:rounded-xl border transition-all
                                  ${isSelected 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' 
                                    : isCurrent
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                  }
                                `}
                                onClick={() => handleSelect(video)}
                                aria-label={`Select video: ${video.title}`}
                                aria-pressed={isSelected}
                              >
                                {/* Thumbnail */}
                                <div className="relative w-24 md:w-40 aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 flex-shrink-0">
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Play className="w-4 h-4 md:w-6 md:h-6 text-white/50" />
                                  </div>
                                  <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 md:px-2 md:py-1 rounded">
                                    {formatDurationSeconds(video.video?.duration || 0)}
                                  </div>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-1 md:mb-2">
                                    <h4 className="font-semibold md:font-bold text-slate-900 dark:text-white line-clamp-2 text-sm md:text-base">
                                      {video.title}
                                    </h4>
                                    {isSelected && (
                                      <Check className="w-4 h-4 md:w-5 md:h-5 text-blue-500 flex-shrink-0" aria-hidden="true" />
                                    )}
                                  </div>
                                  
                                  <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2 md:mb-3">
                                    {video.description}
                                  </p>
                                  
                                  <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1 md:gap-1.5">
                                      <HardDrive className="w-3 h-3 md:w-4 md:h-4" />
                                      {formatFileSize(video.video?.size || 0)}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 md:gap-1.5">
                                      <Users className="w-3 h-3 md:w-4 md:h-4" />
                                      {video.usageCount} uses
                                    </span>
                                    <span>•</span>
                                    <span>{formatDate(video.uploadDate)}</span>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Loading More Indicator */}
                      {loadingMore && (
                        <div className="text-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mx-auto" aria-hidden="true" />
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                            Loading more videos...
                          </p>
                        </div>
                      )}

                      {/* End Message */}
                      {!hasMore && videos.length > 0 && (
                        <div className="text-center py-8 border-t border-slate-200 dark:border-slate-800 mt-8">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Showing all {videos.length} videos
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Selected Video Footer */}
              {selectedVideo && (
                <div className="sticky bottom-0 border-t bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-4 flex-shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Video className="w-5 h-5 md:w-6 md:h-6 text-white" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white truncate text-sm md:text-base">
                          {selectedVideo.title}
                        </p>
                        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 truncate">
                          {formatFileSize(selectedVideo.video?.size || 0)} • {formatDurationSeconds(selectedVideo.video?.duration || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedVideo(null)}
                        className="h-9 md:h-11 px-3 md:px-4 text-xs md:text-sm"
                        aria-label="Clear selection"
                      >
                        Clear
                      </Button>
                      <Button
                        onClick={handleConfirm}
                        className="h-9 md:h-11 px-4 md:px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs md:text-sm"
                        aria-label={`Select ${selectedVideo.title}`}
                      >
                        Select Video
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Filters Sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent 
          side="bottom" 
          className="rounded-t-2xl h-[85vh] p-0"
          aria-describedby="filters-description"
        >
          <SheetDescription id="filters-description" className="sr-only">
            Filter videos by categories and view mode
          </SheetDescription>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <SheetTitle className="text-lg font-bold">Filters</SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(false)}
                aria-label="Close filters"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1 px-4">
              <div className="py-4 space-y-6">
                {/* Categories */}
                <div>
                  <h4 className="font-medium text-sm mb-3 text-slate-700 dark:text-slate-300">
                    Categories
                  </h4>
                  <div className="space-y-2">
                    {categories.map(category => (
                      <label
                        key={category}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        htmlFor={`mobile-category-${category}`}
                      >
                        <input
                          id={`mobile-category-${category}`}
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => toggleCategory(category)}
                          className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500"
                          aria-label={`${selectedCategories.includes(category) ? 'Deselect' : 'Select'} ${category}`}
                        />
                        <span className="text-sm flex-1">{category}</span>
                        <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {videos.filter(v => v.categories?.includes(category)).length}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* View Mode */}
                <div>
                  <h4 className="font-medium text-sm mb-3 text-slate-700 dark:text-slate-300">
                    View Mode
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setViewMode('grid')
                        setShowFilters(false)
                      }}
                      className="flex-1"
                      aria-label="Grid view"
                    >
                      Grid
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setViewMode('list')
                        setShowFilters(false)
                      }}
                      className="flex-1"
                      aria-label="List view"
                    >
                      List
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => {
                  fetchVideos(true)
                  setShowFilters(false)
                }}
                className="w-full h-12"
                aria-label="Apply filters"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
})

VideoLibrarySelector.displayName = 'VideoLibrarySelector'

export default VideoLibrarySelector