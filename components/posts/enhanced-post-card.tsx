// components/posts/enhanced-post-card.tsx
'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Play,
  Pause,
  Grid3x3,
  ShoppingBag,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Verified,
  Loader2,
  Copy,
  Check,
  UserPlus,
  UserCheck,
  Edit,
  Trash2,
  Flag,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Post } from '@/types/post'

interface BatchStatuses {
  likeStatuses: Record<string, boolean>
  saveStatuses: Record<string, { saved: boolean; savedAt?: string }>
  followStatuses: Record<string, boolean>
}

interface EnhancedPostCardProps {
  post: Post
  batchStatusData?: BatchStatuses
  onLike?: (postId: string) => Promise<void>
  onSave?: (postId: string) => Promise<void>
  onShare?: (postId: string) => Promise<void>
  onComment?: (postId: string, text: string) => Promise<void>
  onFollow?: (userId: string) => Promise<void>
  onReport?: (postId: string, reason: string) => void
  onEdit?: (postId: string) => void
  onDelete?: (postId: string) => void
  onPurchase?: (postId: string) => void
  onMention?: (username: string) => void
  onHashtagClick?: (hashtag: string) => void
  currentUserId?: string
  showEngagement?: boolean
  compact?: boolean
  featured?: boolean
  viewMode?: 'grid' | 'masonry' | 'feed' | 'detailed'
  className?: string
}

// Utility functions
const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const getTimeAgo = (date: string): string => {
  const now = new Date()
  const postDate = new Date(date)
  const diffInHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
  return postDate.toLocaleDateString()
}

// Helper functions to safely access data
const getSafeArray = (data: any): any[] => {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (typeof data === 'number') return []
  return []
}

const isUserInArray = (array: any[], userId?: string): boolean => {
  if (!userId || !array || !Array.isArray(array)) return false
  
  return array.some(item => {
    if (!item) return false
    if (typeof item === 'string') return item === userId
    if (typeof item === 'object' && item._id) return item._id === userId
    return false
  })
}

const getCount = (data: any): number => {
  if (!data) return 0
  if (typeof data === 'number') return data
  if (Array.isArray(data)) return data.length
  return 0
}

// Enhanced comment count extraction function - FIXED: Remove metadata reference
const getCommentCountFromPost = (post: Post): number => {
  // 1. First check if there's a direct commentCount property
  if (post.commentCount && typeof post.commentCount === 'number') {
    return post.commentCount
  }
  
  // 2. Check for commentsCount (API format)
  if ((post as any).commentsCount && typeof (post as any).commentsCount === 'number') {
    return (post as any).commentsCount
  }
  
  // 3. Count from comments array if it exists
  const commentsArray = getSafeArray(post.comments)
  if (commentsArray.length > 0) {
    return commentsArray.length
  }
  
  // 4. Default to 0 (REMOVED metadata check as Post type doesn't have it)
  return 0
}

// Helper function to safely get comments array
const getCommentsArray = (comments: any): any[] => {
  if (!comments) return []
  if (Array.isArray(comments)) return comments
  if (typeof comments === 'number') return [] // If it's just a count number
  return []
}

export function EnhancedPostCard({
  post,
  batchStatusData,
  onLike,
  onSave,
  onShare,
  onComment,
  onFollow,
  onReport,
  onEdit,
  onDelete,
  onPurchase,
  onMention,
  onHashtagClick,
  currentUserId,
  showEngagement = true,
  compact = false,
  featured = false,
  viewMode = 'masonry',
  className
}: EnhancedPostCardProps) {
  const { user: currentUser, isLoaded: userLoaded, isSignedIn: clerkIsSignedIn } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  // Calculate comment count from the post using the new function
  const initialCommentCount = useMemo(() => {
    return getCommentCountFromPost(post)
  }, [post])

  const [state, setState] = useState({
    currentMediaIndex: 0,
    isPlaying: false,
    isMuted: true,
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    likeCount: getCount(post.likes),
    saveCount: getCount(post.saves),
    commentCount: initialCommentCount, // Use the calculated comment count
    showShareMenu: false,
    showOptionsMenu: false,
    imageLoaded: false,
    videoProgress: 0,
    isHovered: false,
    showFullCaption: false,
    copied: false,
    mediaLoading: true,
  })

  const [actionLoading, setActionLoading] = useState({
    like: false,
    save: false,
    comment: false,
    follow: false
  })

  const [statuses, setStatuses] = useState<BatchStatuses>({
    likeStatuses: {},
    saveStatuses: {},
    followStatuses: {}
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const shareRef = useRef<HTMLDivElement>(null)
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const userId = currentUserId || currentUser?.id || ''
  const isSignedIn = !!clerkIsSignedIn

  // Update comment count when post changes
  useEffect(() => {
    const newCommentCount = getCommentCountFromPost(post)
    setState(prev => ({
      ...prev,
      commentCount: newCommentCount
    }))
  }, [post])

  // Fetch statuses for the post including comment count
  const fetchStatuses = useCallback(async () => {
    if (!post._id) return

    try {
      if (!isSignedIn) {
        const likesArray = getSafeArray(post.likes)
        const savesArray = getSafeArray(post.saves)
        const followersArray = getSafeArray(post.author?.followers)
        
        const liked = isUserInArray(likesArray, userId)
        const saved = isUserInArray(savesArray, userId)
        const following = isUserInArray(followersArray, userId)
        
        setState(prev => ({
          ...prev,
          isLiked: liked,
          isSaved: saved,
          isFollowing: following,
          commentCount: initialCommentCount // Set comment count here too
        }))
        
        setStatuses({
          likeStatuses: { [post._id]: liked },
          saveStatuses: { [post._id]: { saved: saved } },
          followStatuses: { [post.author?._id]: following }
        })
        return
      }
      
      const response = await fetch('/api/batch-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postIds: [post._id],
          userIds: post.author?._id ? [post.author._id] : []
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.data) {
          const batchData = data.data
          setStatuses(batchData)
          
          setState(prev => ({
            ...prev,
            isLiked: batchData.likeStatuses[post._id] || false,
            isSaved: batchData.saveStatuses[post._id]?.saved || false,
            isFollowing: batchData.followStatuses[post.author?._id] || false,
            commentCount: initialCommentCount // Make sure comment count is set
          }))
        } else {
          initializeFromPostData()
        }
      } else {
        initializeFromPostData()
      }
    } catch (error) {
      initializeFromPostData()
    }
  }, [post._id, post.author?._id, post.likes, post.saves, post.author?.followers, userId, isSignedIn, initialCommentCount])

  // Helper function to initialize from post data
  const initializeFromPostData = useCallback(() => {
    const likesArray = getSafeArray(post.likes)
    const savesArray = getSafeArray(post.saves)
    const followersArray = getSafeArray(post.author?.followers)
    
    const liked = isUserInArray(likesArray, userId)
    const saved = isUserInArray(savesArray, userId)
    const following = isUserInArray(followersArray, userId)
    
    setState(prev => ({
      ...prev,
      isLiked: liked,
      isSaved: saved,
      isFollowing: following,
      commentCount: initialCommentCount // Set comment count here too
    }))
    
    setStatuses({
      likeStatuses: { [post._id]: liked },
      saveStatuses: { [post._id]: { saved: saved } },
      followStatuses: { [post.author?._id]: following }
    })
  }, [post._id, post.author?._id, post.likes, post.saves, post.author?.followers, userId, initialCommentCount])

  // Initialize states
  useEffect(() => {
    if (batchStatusData) {
      setStatuses(batchStatusData)
      setState(prev => ({
        ...prev,
        isLiked: batchStatusData.likeStatuses[post._id] || false,
        isSaved: batchStatusData.saveStatuses[post._id]?.saved || false,
        isFollowing: batchStatusData.followStatuses[post.author?._id] || false,
        commentCount: initialCommentCount // Set comment count
      }))
    } else if (userLoaded) {
      fetchStatuses()
    }
  }, [batchStatusData, post._id, post.author?._id, userLoaded, fetchStatuses, initialCommentCount])

  // Handle like
  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (actionLoading.like || !post._id) return

    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to like posts",
        variant: "destructive"
      })
      return
    }

    const wasLiked = statuses.likeStatuses[post._id] || state.isLiked

    // Optimistic update
    setState(prev => ({
      ...prev,
      isLiked: !wasLiked,
      likeCount: !wasLiked ? prev.likeCount + 1 : prev.likeCount - 1
    }))

    setStatuses(prev => ({
      ...prev,
      likeStatuses: {
        ...prev.likeStatuses,
        [post._id]: !wasLiked
      }
    }))

    setActionLoading(prev => ({ ...prev, like: true }))

    try {
      if (onLike) {
        await onLike(post._id)
      } else {
        const response = await fetch(`/api/posts/${post._id}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Like failed')
        }
      }
    } catch (error: any) {
      // Revert on error
      setState(prev => ({
        ...prev,
        isLiked: wasLiked,
        likeCount: wasLiked ? prev.likeCount + 1 : prev.likeCount - 1
      }))
      
      setStatuses(prev => ({
        ...prev,
        likeStatuses: {
          ...prev.likeStatuses,
          [post._id]: wasLiked
        }
      }))
      
      toast({
        title: "Error",
        description: error.message || "Failed to like post",
        variant: "destructive"
      })
    } finally {
      setActionLoading(prev => ({ ...prev, like: false }))
    }
  }, [actionLoading.like, post._id, userId, isSignedIn, toast, onLike, statuses.likeStatuses, state.isLiked])

  // Handle save
  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (actionLoading.save || !post._id) return

    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to save posts",
        variant: "destructive"
      })
      return
    }
    
    const wasSaved = statuses.saveStatuses[post._id]?.saved || state.isSaved

    setState(prev => ({
      ...prev,
      isSaved: !wasSaved,
      saveCount: !wasSaved ? prev.saveCount + 1 : prev.saveCount - 1
    }))

    setStatuses(prev => ({
      ...prev,
      saveStatuses: {
        ...prev.saveStatuses,
        [post._id]: { 
          saved: !wasSaved, 
          savedAt: !wasSaved ? new Date().toISOString() : undefined 
        }
      }
    }))

    setActionLoading(prev => ({ ...prev, save: true }))

    try {
      if (onSave) {
        await onSave(post._id)
      } else {
        const response = await fetch(`/api/posts/${post._id}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Save failed')
        }
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isSaved: wasSaved,
        saveCount: wasSaved ? prev.saveCount + 1 : prev.saveCount - 1
      }))
      
      setStatuses(prev => ({
        ...prev,
        saveStatuses: {
          ...prev.saveStatuses,
          [post._id]: { saved: wasSaved }
        }
      }))
      
      toast({
        title: "Error",
        description: error.message || "Failed to save post",
        variant: "destructive"
      })
    } finally {
      setActionLoading(prev => ({ ...prev, save: false }))
    }
  }, [actionLoading.save, post._id, userId, isSignedIn, toast, onSave, statuses.saveStatuses, state.isSaved])

  // Handle follow - FIXED: Type signature to match OptionsMenu's expectation
  const handleFollow = useCallback(async () => {
    if (actionLoading.follow || !post.author?._id) return

    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to follow users",
        variant: "destructive"
      })
      return
    }

    const authorId = post.author._id
    
    const previousIsFollowing = statuses.followStatuses[authorId] || state.isFollowing

    setState(prev => ({ ...prev, isFollowing: !previousIsFollowing }))
    setStatuses(prev => ({
      ...prev,
      followStatuses: {
        ...prev.followStatuses,
        [authorId]: !previousIsFollowing
      }
    }))

    setActionLoading(prev => ({ ...prev, follow: true }))

    try {
      if (onFollow) {
        await onFollow(post.author._id)
      } else {
        const response = await fetch(`/api/users/${authorId}/follow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = await response.json()

        if (!result.success) throw new Error(result.error || "Follow request failed")
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, isFollowing: previousIsFollowing }))
      setStatuses(prev => ({
        ...prev,
        followStatuses: {
          ...prev.followStatuses,
          [authorId]: previousIsFollowing
        }
      }))

      toast({
        title: "Error",
        description: error.message || "Failed to follow user",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, follow: false }))
    }
  }, [actionLoading.follow, post.author?._id, userId, isSignedIn, toast, onFollow, statuses.followStatuses, state.isFollowing])

  // Handle share
  const handleShare = useCallback(async (method: 'link' | 'social' = 'link') => {
    setState(prev => ({ ...prev, showShareMenu: false }))
    
    try {
      const postUrl = `${window.location.origin}/posts/${post._id}`
      
      if (method === 'link') {
        await navigator.clipboard.writeText(postUrl)
        setState(prev => ({ ...prev, copied: true }))
        setTimeout(() => setState(prev => ({ ...prev, copied: false })), 2000)
        toast({
          title: "Link copied",
          description: "Post link copied to clipboard"
        })
      } else if (method === 'social' && navigator.share) {
        await navigator.share({
          title: `Check out this post by ${post.author?.firstName}`,
          text: post.caption,
          url: postUrl,
        })
        
        if (onShare) {
          await onShare(post._id)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share post",
        variant: "destructive"
      })
    }
  }, [post._id, post.author?.firstName, post.caption, onShare, toast])

  // Media navigation
  const nextMedia = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState(prev => ({
      ...prev,
      currentMediaIndex: (prev.currentMediaIndex + 1) % mediaArray.length
    }))
  }

  const prevMedia = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState(prev => ({
      ...prev,
      currentMediaIndex: (prev.currentMediaIndex - 1 + mediaArray.length) % mediaArray.length
    }))
  }

  // Video controls
  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (videoRef.current) {
      if (state.isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
    }
  }

  const handleVideoProgress = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setState(prev => ({ ...prev, videoProgress: progress }))
    }
  }

  // Optimized image loading
  const handleImageLoad = useCallback(() => {
    setState(prev => ({ ...prev, imageLoaded: true, mediaLoading: false }))
  }, [])

  // Navigate to post detail
  const navigateToPostDetail = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    router.push(`/posts/${post._id}`)
  }, [post._id, router])

  // Auto-play video on hover
  useEffect(() => {
    if (state.isHovered && currentMedia?.type === 'video') {
      autoPlayTimerRef.current = setTimeout(() => {
        if (videoRef.current && !state.isPlaying) {
          videoRef.current.play()
          setState(prev => ({ ...prev, isPlaying: true }))
        }
      }, 300)
    } else {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current)
      }
      if (videoRef.current && state.isPlaying) {
        videoRef.current.pause()
        setState(prev => ({ ...prev, isPlaying: false }))
      }
    }

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current)
      }
    }
  }, [state.isHovered, state.currentMediaIndex, post.media, state.isPlaying])

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setState(prev => ({ ...prev, showOptionsMenu: false }))
      }
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setState(prev => ({ ...prev, showShareMenu: false }))
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Current media item
  const mediaArray = useMemo(() => Array.isArray(post.media) ? post.media : [], [post.media])
  const currentMedia = mediaArray[state.currentMediaIndex] || mediaArray[0]
  const hasMedia = mediaArray.length > 0

  // 1. Pinterest-inspired Masonry View with Overlay Content
  if (viewMode === 'masonry') {
    return (
      <div className={cn("relative break-inside-avoid", className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="group relative cursor-pointer"
          onMouseEnter={() => setState(prev => ({ ...prev, isHovered: true }))}
          onMouseLeave={() => setState(prev => ({ 
            ...prev, 
            isHovered: false,
            showFullCaption: false
          }))}
        >
          {/* Pinterest-style Card Container */}
          <div className={cn(
            "relative overflow-hidden rounded-xl",
            "bg-transparent",
            "hover:shadow-xl transition-all duration-300"
          )}>
            {/* Media Container */}
            {hasMedia ? (
              <div 
                className="relative aspect-auto overflow-hidden rounded-xl"
                onClick={navigateToPostDetail}
              >
                {currentMedia?.type === 'video' ? (
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      src={currentMedia.url}
                      className="w-full h-auto max-h-[600px] object-contain rounded-xl"
                      muted={state.isMuted}
                      loop
                      onTimeUpdate={handleVideoProgress}
                      playsInline
                    />
                    {/* Video controls overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-1 mb-2">
                          <div 
                            className="bg-gradient-to-r from-rose-500 to-pink-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${state.videoProgress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={togglePlay}
                            className="w-8 h-8 bg-white/20 backdrop-blur-lg text-white rounded-full hover:bg-white/30 hover:scale-110 transition-all"
                          >
                            {state.isPlaying ? 
                              <Pause className="w-3 h-3" /> : 
                              <Play className="w-3 h-3 ml-0.5" />
                            }
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {/* Loading skeleton */}
                    {state.mediaLoading && (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 animate-pulse rounded-xl" />
                    )}
                    <img
                      ref={imageRef}
                      src={currentMedia?.url || '/placeholder.png'}
                      alt={post.caption}
                      className={cn(
                        "w-full h-auto max-h-[600px] object-contain rounded-xl transition-all duration-500",
                        state.imageLoaded ? 'group-hover:scale-[1.02]' : 'opacity-0'
                      )}
                      onLoad={handleImageLoad}
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Top gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />

                {/* Top bar with user info and badges - ALWAYS VISIBLE */}
                <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between">
                  {/* User info */}
                  <Link 
                    href={`/profile/${post.author?.username}`} 
                    className="flex items-center gap-2 group/author"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7 border-2 border-white/80">
                        <AvatarImage src={post.author?.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white text-xs font-semibold">
                          {post.author?.firstName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-white drop-shadow-lg">
                            {post.author?.firstName || 'User'}
                          </span>
                          {post.author?.isVerified && (
                            <Verified className="w-3 h-3 text-blue-400 drop-shadow-lg" />
                          )}
                        </div>
                        <span className="text-xs text-white/80 drop-shadow-lg">
                          {getTimeAgo(post.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Top badges and options button */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {post.aiGenerated && (
                        <Badge className="bg-gradient-to-r from-purple-600/90 to-violet-600/90 text-white px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm">
                          <Sparkles className="w-3 h-3 mr-1 inline" />
                          AI
                        </Badge>
                      )}
                      {post.availableForSale && post.price && (
                        <Badge className="bg-gradient-to-r from-emerald-600/90 to-green-600/90 text-white px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm">
                          <ShoppingBag className="w-3 h-3 mr-1 inline" />
                          ${post.price}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Options menu button */}
                    <div className="relative" ref={optionsRef}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setState(prev => ({ ...prev, showOptionsMenu: !prev.showOptionsMenu }))
                        }}
                        className="w-7 h-7 bg-black/60 backdrop-blur-sm text-white rounded-full hover:bg-black/80 transition-colors"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </Button>

                      <AnimatePresence>
                        {state.showOptionsMenu && (
                          <OptionsMenu
                            post={post}
                            currentUserId={userId}
                            isFollowing={state.isFollowing}
                            onFollow={handleFollow}
                            onEdit={() => {
                              if (onEdit) onEdit(post._id)
                            }}
                            onDelete={() => {
                              if (onDelete) onDelete(post._id)
                            }}
                            onReport={onReport}
                            onClose={() => setState(prev => ({ ...prev, showOptionsMenu: false }))}
                            actionLoading={actionLoading}
                            isSignedIn={isSignedIn}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Multiple media indicator */}
                {mediaArray.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center shadow-lg">
                    <Grid3x3 className="w-3 h-3 mr-1" />
                    <span className="font-semibold">{mediaArray.length}</span>
                  </div>
                )}

                {/* Media navigation buttons */}
                {mediaArray.length > 1 && state.isHovered && (
                  <>
                    <button
                      onClick={prevMedia}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/70 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-all"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={nextMedia}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/70 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-all"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </>
                )}

                {/* Main content overlay - Bottom section with proper spacing */}
                <div className="absolute bottom-0 left-0 right-0">
                  {/* Gradient overlay for better text readability */}
                  <div className="h-48 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
                  
                  {/* Content container with proper spacing */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
                    {/* Stats row - Left aligned */}
                    <div className="flex items-center gap-4">
                      {/* Like button with count */}
                      <button
                        onClick={handleLike}
                        disabled={!isSignedIn || actionLoading.like}
                        className="flex items-center gap-1.5 group/like"
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-full backdrop-blur-lg flex items-center justify-center transition-all duration-300",
                          state.isLiked 
                            ? "bg-gradient-to-br from-rose-500 to-pink-500" 
                            : "bg-black/60 group-hover/like:bg-black/80"
                        )}>
                          {actionLoading.like ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                          ) : (
                            <Heart className={cn(
                              "w-4 h-4",
                              state.isLiked ? "text-white fill-current" : "text-white"
                            )} />
                          )}
                        </div>
                        <span className="text-sm font-semibold text-white drop-shadow-lg">
                          {formatNumber(state.likeCount)}
                        </span>
                      </button>
                      
                      {/* Comment button with count - SHOWING ACTUAL COMMENT COUNT */}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          router.push(`/posts/${post._id}#comments`)
                        }}
                        className="flex items-center gap-1.5 group/comment"
                      >
                        <div className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-lg flex items-center justify-center group-hover/comment:bg-black/80 transition-all duration-300">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-white drop-shadow-lg">
                          {formatNumber(state.commentCount)}
                        </span>
                      </button>

                      {/* Action buttons - Right aligned */}
                      <div className="flex-1" />
                      
                      <div className="flex items-center gap-2">
                        {/* Save button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleSave}
                          disabled={!isSignedIn || actionLoading.save}
                          className={cn(
                            "w-9 h-9 rounded-full backdrop-blur-lg transition-all duration-300",
                            state.isSaved 
                              ? "bg-gradient-to-br from-amber-500 to-yellow-500 text-white" 
                              : "bg-black/60 text-white hover:bg-black/80",
                            "hover:scale-110"
                          )}
                        >
                          {actionLoading.save ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Bookmark className={cn("w-4 h-4", state.isSaved && "fill-current")} />
                          )}
                        </Button>
                        
                        {/* Share button */}
                        <div className="relative" ref={shareRef}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setState(prev => ({ ...prev, showShareMenu: !prev.showShareMenu }))
                            }}
                            className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 backdrop-blur-lg text-white hover:scale-110 transition-all duration-300"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Caption and hashtags - Below stats with proper spacing */}
                    <div className="space-y-2">
                      {/* Caption with expand functionality */}
                      {post.caption && (
                        <div className="max-w-full">
                          <p className={cn(
                            "text-sm text-white drop-shadow-lg leading-relaxed break-words",
                            !state.showFullCaption && "line-clamp-2"
                          )}>
                            {post.caption}
                          </p>
                          {post.caption.length > 120 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setState(prev => ({ ...prev, showFullCaption: !prev.showFullCaption }))
                              }}
                              className="text-sm text-white/80 hover:text-white mt-1 font-medium drop-shadow-lg"
                            >
                              {state.showFullCaption ? 'Show less' : 'Read more'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Hashtags - Wrapped properly */}
                      {post.hashtags && Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {post.hashtags.slice(0, 4).map((tag, index) => (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onHashtagClick?.(tag)
                              }}
                              className="text-xs text-blue-300 hover:text-blue-200 font-medium drop-shadow-lg bg-blue-900/30 backdrop-blur-sm px-2 py-1 rounded-full hover:bg-blue-900/50 transition-colors"
                            >
                              #{tag}
                            </button>
                          ))}
                          {post.hashtags.length > 4 && (
                            <span className="text-xs text-white/60 px-2 py-1">
                              +{post.hashtags.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                onClick={navigateToPostDetail}
                className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center rounded-xl cursor-pointer"
              >
                <ImageIcon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
              </div>
            )}
          </div>

          {/* Share Menu */}
          <AnimatePresence>
            {state.showShareMenu && (
              <ShareMenu
                onShare={handleShare}
                onClose={() => setState(prev => ({ ...prev, showShareMenu: false }))}
                copied={state.copied}
                currentMedia={currentMedia}
                post={post}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    )
  }

  // 2. Grid View - Photo Only with Click Navigation
  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ 
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
        transition={{ duration: 0.2 }}
        className={cn("group relative", className)}
        onMouseEnter={() => setState(prev => ({ ...prev, isHovered: true }))}
        onMouseLeave={() => setState(prev => ({ ...prev, isHovered: false }))}
      >
        {/* Clickable container for navigation */}
        <div 
          onClick={navigateToPostDetail}
          className={cn(
            "relative overflow-hidden rounded-lg cursor-pointer",
            "bg-transparent",
            "hover:shadow-lg transition-all duration-200"
          )}
        >
          {/* Photo Only - No details shown */}
          {hasMedia ? (
            <div className="relative aspect-square overflow-hidden rounded-lg">
              {currentMedia?.type === 'video' ? (
                <div className="relative w-full h-full">
                  <video
                    src={currentMedia.url}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Play className="w-8 h-8 text-white/80" />
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {state.mediaLoading && (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 animate-pulse rounded-lg" />
                  )}
                  <img
                    src={currentMedia?.url || '/placeholder.png'}
                    alt={post.caption}
                    className={cn(
                      "w-full h-full object-cover transition-all duration-500 rounded-lg",
                      state.imageLoaded ? 'group-hover:scale-105' : 'opacity-0'
                    )}
                    onLoad={handleImageLoad}
                    loading="lazy"
                  />
                </div>
              )}

              {/* Multiple Media Indicator */}
              {mediaArray.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-full">
                  {mediaArray.length}
                </div>
              )}

              {/* Stats overlay on hover */}
              <AnimatePresence>
                {state.isHovered && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-lg"
                  >
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="flex items-center justify-between text-white text-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Heart className={cn("w-3.5 h-3.5", state.isLiked && "fill-current")} />
                            <span className="font-semibold">{formatNumber(state.likeCount)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="font-semibold">{formatNumber(state.commentCount)}</span>
                          </div>
                        </div>
                        
                        {post.availableForSale && post.price && (
                          <Badge className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-2 py-0.5 text-xs font-semibold">
                            ${post.price}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Badge */}
              {post.aiGenerated && (
                <div className="absolute top-2 left-2">
                  <div className="bg-gradient-to-r from-purple-600 to-violet-600 rounded-full p-1">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center rounded-lg">
              <ImageIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  // Default to masonry view
  return null
}

// Options Menu Component - FIXED: onFollow prop type signature
function OptionsMenu({
  post,
  currentUserId,
  isFollowing,
  onFollow,
  onEdit,
  onDelete,
  onReport,
  onClose,
  actionLoading,
  isSignedIn
}: {
  post: Post
  currentUserId?: string
  isFollowing: boolean
  onFollow: () => void
  onEdit: () => void
  onDelete: () => void
  onReport?: (postId: string, reason: string) => void
  onClose: () => void
  actionLoading: { follow: boolean }
  isSignedIn: boolean
}) {
  const { toast } = useToast()
  const isAuthor = currentUserId === post.author._id

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 py-2"
    >
      {isAuthor ? (
        <>
          <button
            onClick={() => { onEdit(); onClose(); }}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Edit className="w-4 h-4 text-blue-500" />
            <span>Edit Post</span>
          </button>
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Post</span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => { onFollow(); onClose(); }}
            disabled={!isSignedIn || actionLoading.follow}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading.follow ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : isFollowing ? (
              <UserCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <UserPlus className="w-4 h-4 text-blue-500" />
            )}
            <span>
              {actionLoading.follow ? 'Processing...' :
                isFollowing ? `Unfollow ${post.author.firstName}` :
                  `Follow ${post.author.firstName}`}
            </span>
          </button>
          <button
            onClick={() => { 
              if (!isSignedIn) {
                toast({
                  title: "Please sign in",
                  description: "You need to be signed in to report posts",
                  variant: "destructive"
                })
                return
              }
              onReport?.(post._id, 'inappropriate'); 
              onClose(); 
            }}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Flag className="w-4 h-4" />
            <span>Report Post</span>
          </button>
        </>
      )}
      <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${window.location.origin}/posts/${post._id}`)
            toast({
              title: "Link copied!",
              description: "Post link copied to clipboard",
            })
            onClose()
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to copy link",
              variant: "destructive"
            })
          }
        }}
        className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Copy className="w-4 h-4 text-slate-500" />
        <span>Copy Link</span>
      </button>
    </motion.div>
  )
}

// Share Menu Component
function ShareMenu({
  onShare,
  onClose,
  copied,
  currentMedia,
  post
}: {
  onShare: (method: 'link' | 'social') => void
  onClose: () => void
  copied: boolean
  currentMedia: any
  post: Post
}) {
  const { toast } = useToast()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 py-2"
    >
      <button
        onClick={() => onShare('social')}
        className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Share2 className="w-4 h-4 text-emerald-500" />
        <span>Share via...</span>
      </button>
      <button
        onClick={() => onShare('link')}
        className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-emerald-600">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-slate-500" />
            <span>Copy Link</span>
          </>
        )}
      </button>
    </motion.div>
  )
}