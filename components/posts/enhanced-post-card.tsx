'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Heart,
  MessageCircle,
  Share2,
  X,
  Bookmark,
  MoreHorizontal,
  Check,
  Clock,
  MapPin,
  Tag,
  Send,
  ThumbsUp,
  Crown,
  Star,
  Flag,
  Users,
  Sparkles,
  ShoppingBag,
  Edit,
  Trash2,
  UserPlus,
  UserCheck,
  Loader2,
  Copy,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Video,
  Grid3x3,
  Maximize2,
  Eye,
  Download,
  ExternalLink,
  Zap,
  TrendingUp,
  BarChart3,
  Filter,
  LayoutGrid,
  List,
  Verified,
  HeartOff,
  BookmarkPlus,
  DownloadCloud,
  ExternalLink as LinkIcon,
  MoreVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Post, Comment, User as UserType } from '@/types/post'

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
  if (typeof data === 'object' && 'length' in data && typeof data.length === 'number') {
    return Array.from(data)
  }
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
  if (typeof data === 'object' && 'length' in data && typeof data.length === 'number') {
    return data.length
  }
  return 0
}

// Helper function to safely get comments array
const getCommentsArray = (comments: any): Comment[] => {
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
  
  const [state, setState] = useState({
    currentMediaIndex: 0,
    isPlaying: false,
    isMuted: true,
    showComments: false,
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    likeCount: getCount(post.likes),
    saveCount: getCount(post.saves),
    commentCount: getCount(post.comments),
    commentText: '',
    showShareMenu: false,
    showOptionsMenu: false,
    imageLoaded: false,
    videoProgress: 0,
    isHovered: false,
    showFullCaption: false,
    copied: false,
    isFullscreen: false,
    showEngagementStats: false,
    showDeleteConfirm: false,
    isLoadingStatus: true,
    showQuickActions: false,
    showEditModal: false
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

  const [optimisticFollowers, setOptimisticFollowers] = useState<number>(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const shareRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null)

  const userId = currentUserId || currentUser?.id || ''
  const isSignedIn = !!clerkIsSignedIn // Convert to boolean

  // Fetch statuses for the post
  const fetchStatuses = useCallback(async () => {
    if (!post._id) return

    try {
      // If not signed in, we can't fetch user-specific statuses
      if (!isSignedIn) {
        // Initialize from post data for non-signed-in users
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
          isLoadingStatus: false
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
          
          // Update states from batch data
          setState(prev => ({
            ...prev,
            isLiked: batchData.likeStatuses[post._id] || false,
            isSaved: batchData.saveStatuses[post._id]?.saved || false,
            isFollowing: batchData.followStatuses[post.author?._id] || false,
            isLoadingStatus: false
          }))
        } else {
          // Fallback to post data if batch API fails
          initializeFromPostData()
        }
      } else {
        // Fallback to post data
        initializeFromPostData()
      }
    } catch (error) {
      // Fallback to post data
      initializeFromPostData()
    }
  }, [post._id, post.author?._id, post.likes, post.saves, post.author?.followers, userId, isSignedIn])

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
      isLoadingStatus: false
    }))
    
    setStatuses({
      likeStatuses: { [post._id]: liked },
      saveStatuses: { [post._id]: { saved: saved } },
      followStatuses: { [post.author?._id]: following }
    })
  }, [post._id, post.author?._id, post.likes, post.saves, post.author?.followers, userId])

  // Initialize states
  useEffect(() => {
    if (batchStatusData) {
      // Use batch data if available from parent component
      setStatuses(batchStatusData)
      setState(prev => ({
        ...prev,
        isLiked: batchStatusData.likeStatuses[post._id] || false,
        isSaved: batchStatusData.saveStatuses[post._id]?.saved || false,
        isFollowing: batchStatusData.followStatuses[post.author?._id] || false,
        isLoadingStatus: false
      }))
    } else if (userLoaded) {
      // Fetch statuses after user is loaded
      fetchStatuses()
    }
  }, [batchStatusData, post._id, post.author?._id, userLoaded, fetchStatuses])

  // Initialize follower count
  useEffect(() => {
    if (post.author?.followers) {
      const followerCount = Array.isArray(post.author.followers) 
        ? post.author.followers.length 
        : 0
      setOptimisticFollowers(followerCount)
    }
  }, [post.author?.followers])

  // Handle like with optimistic updates and status integration
  const handleLike = useCallback(async () => {
    if (actionLoading.like || !post._id) return

    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to like posts",
        variant: "destructive"
      })
      return
    }

    // Get current like status from statuses (most accurate)
    const wasLiked = statuses.likeStatuses[post._id] || state.isLiked

    // Optimistic update
    setState(prev => ({
      ...prev,
      isLiked: !wasLiked,
      likeCount: !wasLiked ? prev.likeCount + 1 : prev.likeCount - 1
    }))

    // Update statuses optimistically
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
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          // Refresh statuses to ensure consistency
          await fetchStatuses()
        } else {
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
  }, [
    actionLoading.like, 
    post._id, 
    userId, 
    isSignedIn, 
    toast, 
    onLike, 
    fetchStatuses,
    statuses.likeStatuses,
    state.isLiked,
    state.likeCount
  ])

  // Handle save with optimistic updates and status integration
  const handleSave = useCallback(async () => {
    if (actionLoading.save || !post._id) return

    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to save posts",
        variant: "destructive"
      })
      return
    }
    
    // Get current save status from statuses (most accurate)
    const wasSaved = statuses.saveStatuses[post._id]?.saved || state.isSaved

    // Optimistic update
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

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          // Refresh statuses to ensure consistency
          await fetchStatuses()
        } else {
          throw new Error(data.error || 'Save failed')
        }
      }
    } catch (error: any) {
      // Revert on error
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
  }, [
    actionLoading.save, 
    post._id, 
    userId, 
    isSignedIn, 
    toast, 
    onSave, 
    fetchStatuses,
    statuses.saveStatuses,
    state.isSaved,
    state.saveCount
  ])

  // Handle follow with optimistic updates and status integration
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
    
    // Get current follow status from statuses (most accurate)
    const previousIsFollowing = statuses.followStatuses[authorId] || state.isFollowing
    const previousFollowerCount = optimisticFollowers

    // Optimistic UI update
    setState(prev => ({ ...prev, isFollowing: !previousIsFollowing }))
    setOptimisticFollowers(prev => 
      previousIsFollowing ? Math.max(0, prev - 1) : prev + 1
    )
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

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "Follow request failed")
        }

        // Refresh statuses to ensure consistency
        await fetchStatuses()
      }
    } catch (error: any) {
      // Revert optimistic update
      setState(prev => ({ ...prev, isFollowing: previousIsFollowing }))
      setOptimisticFollowers(previousFollowerCount)
      setStatuses(prev => ({
        ...prev,
        followStatuses: {
          ...prev.followStatuses,
          [authorId]: previousIsFollowing
        }
      }))

      toast({
        title: "Error",
        description: error.message || "Failed to follow user. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setActionLoading(prev => ({ ...prev, follow: false }))
    }
  }, [
    actionLoading.follow, 
    post.author?._id, 
    post.author?.firstName, 
    userId, 
    isSignedIn, 
    toast, 
    onFollow, 
    fetchStatuses,
    statuses.followStatuses,
    state.isFollowing,
    optimisticFollowers
  ])

  // Handle comment with optimistic updates
  const handleCommentSubmit = useCallback(async () => {
    if (!state.commentText.trim() || actionLoading.comment || !post._id) {
      if (!isSignedIn) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to comment",
          variant: "destructive"
        })
      }
      return
    }

    setActionLoading(prev => ({ ...prev, comment: true }))
    const text = state.commentText.trim()
    const tempCommentId = `temp-${Date.now()}`

    // Create temp comment with proper structure
    const tempComment: Comment = {
      _id: tempCommentId,
      user: {
        _id: userId,
        clerkId: currentUser?.id || '',
        username: currentUser?.username || 'user',
        firstName: currentUser?.firstName || 'User',
        lastName: currentUser?.lastName || '',
        avatar: currentUser?.imageUrl || '',
        email: currentUser?.primaryEmailAddress?.emailAddress || '',
        isVerified: false,
        isPro: false,
        followers: [],
        following: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      text: text,
      post: post._id,
      likes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Optimistic update
    setState(prev => ({
      ...prev,
      commentText: '',
      commentCount: prev.commentCount + 1,
      showComments: true
    }))

    try {
      if (onComment) {
        await onComment(post._id, text)
        toast({
          title: "Comment added",
          description: "Your comment has been posted"
        })
      } else {
        const response = await fetch(`/api/posts/${post._id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, userId })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        
        if (data.success) {
          toast({
            title: "Comment added",
            description: "Your comment has been posted"
          })
        } else {
          throw new Error(data.error || 'Comment failed')
        }
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setState(prev => ({
        ...prev,
        commentText: text,
        commentCount: prev.commentCount - 1,
        showComments: true
      }))
      
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive"
      })
    } finally {
      setActionLoading(prev => ({ ...prev, comment: false }))
    }
  }, [
    state.commentText, 
    actionLoading.comment, 
    post._id, 
    post.comments,
    userId, 
    currentUser,
    isSignedIn, 
    onComment, 
    toast
  ])

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
  const nextMedia = () => {
    setState(prev => ({
      ...prev,
      currentMediaIndex: (prev.currentMediaIndex + 1) % post.media.length
    }))
  }

  const prevMedia = () => {
    setState(prev => ({
      ...prev,
      currentMediaIndex: (prev.currentMediaIndex - 1 + post.media.length) % post.media.length
    }))
  }

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (state.isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !state.isMuted
      setState(prev => ({ ...prev, isMuted: !prev.isMuted }))
    }
  }

  const handleVideoProgress = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setState(prev => ({ ...prev, videoProgress: progress }))
    }
  }

  // Auto-play video on hover
  useEffect(() => {
    if (state.isHovered && post.media?.[state.currentMediaIndex]?.type === 'video') {
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

  // Current media item - safe access
  const currentMedia = post.media?.[state.currentMediaIndex] || post.media?.[0]
  const mediaArray = Array.isArray(post.media) ? post.media : []
  const hasMedia = mediaArray.length > 0

  // Get safe comments array
  const commentsArray = useMemo(() => getCommentsArray(post.comments), [post.comments])

  // 1. Pinterest-inspired Masonry View (Glass Morphic)
  if (viewMode === 'masonry') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
        whileHover={{ 
          y: -8,
          transition: { duration: 0.3 }
        }}
        className={cn("group relative break-inside-avoid cursor-pointer", className)}
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/0 to-white/0 dark:from-slate-800/0 dark:to-slate-900/0 shadow-xl hover:shadow-2xl transition-all duration-500">
          {/* Media Container */}
          {hasMedia ? (
            <div 
              className="relative overflow-hidden rounded-2xl"
              onMouseEnter={() => setState(prev => ({ ...prev, isHovered: true, showQuickActions: true }))}
              onMouseLeave={() => setState(prev => ({ ...prev, isHovered: false, showQuickActions: false }))}
            >
              <Link href={`/posts/${post._id}`}>
                {currentMedia?.type === 'video' ? (
                  <div className="relative w-full">
                    <video
                      ref={videoRef}
                      src={currentMedia.url}
                      className="w-full h-auto object-cover rounded-2xl"
                      muted={state.isMuted}
                      loop
                    />
                    {/* Video Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl">
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-1.5 mb-2">
                          <div 
                            className="bg-gradient-to-r from-rose-500 to-pink-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${state.videoProgress}%` }}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          togglePlay()
                        }}
                        className="w-14 h-14 bg-gradient-to-br from-black/70 to-black/50 backdrop-blur-lg text-white rounded-full hover:bg-black/80 hover:scale-110 transition-all shadow-2xl"
                      >
                        {state.isPlaying ? 
                          <Pause className="w-6 h-6" /> : 
                          <Play className="w-6 h-6 ml-0.5" />
                        }
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full">
                    {!state.imageLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 animate-pulse rounded-2xl" />
                    )}
                    <img
                      src={currentMedia?.url || '/placeholder.png'}
                      alt={post.caption}
                      className={cn(
                        "w-full h-auto object-cover transition-all duration-700 rounded-2xl",
                        state.imageLoaded ? 'group-hover:scale-105' : 'opacity-0',
                        "brightness-95 hover:brightness-100"
                      )}
                      onLoad={() => setState(prev => ({ ...prev, imageLoaded: true }))}
                    />
                  </div>
                )}
              </Link>

              {/* Multiple Media Indicator */}
              {mediaArray.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center backdrop-blur-lg shadow-lg">
                  <Grid3x3 className="w-3 h-3 mr-1" />
                  <span className="font-medium">{mediaArray.length}</span>
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />

              {/* Quick Actions Overlay */}
              <AnimatePresence>
                {state.isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 rounded-b-2xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            handleLike()
                          }}
                          disabled={!isSignedIn || actionLoading.like}
                          className={cn(
                            "w-9 h-9 rounded-full backdrop-blur-lg transition-all duration-300 hover:scale-110",
                            state.isLiked 
                              ? "bg-gradient-to-br from-rose-500/60 to-pink-500/60 text-white hover:from-rose-500/70 hover:to-pink-500/70" 
                              : "bg-black/50 text-white hover:bg-black/70",
                            !isSignedIn && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {actionLoading.like ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Heart className={cn("w-4 h-4", state.isLiked && "fill-current")} />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            router.push(`/posts/${post._id}#comments`)
                          }}
                          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-lg text-white hover:bg-black/70 hover:scale-110 transition-all duration-300"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            handleSave()
                          }}
                          disabled={!isSignedIn || actionLoading.save}
                          className={cn(
                            "w-9 h-9 rounded-full backdrop-blur-lg transition-all duration-300 hover:scale-110",
                            state.isSaved 
                              ? "bg-gradient-to-br from-amber-500/60 to-yellow-500/60 text-white hover:from-amber-500/70 hover:to-yellow-500/70" 
                              : "bg-black/50 text-white hover:bg-black/70",
                            !isSignedIn && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {actionLoading.save ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Bookmark className={cn("w-4 h-4", state.isSaved && "fill-current")} />
                          )}
                        </Button>
                      </div>
                      
                      <div className="relative" ref={shareRef}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            setState(prev => ({ ...prev, showShareMenu: !prev.showShareMenu }))
                          }}
                          className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/60 to-green-500/60 backdrop-blur-lg text-white hover:from-emerald-500/70 hover:to-green-500/70 hover:scale-110 transition-all duration-300"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Purchase Badge */}
              {post.availableForSale && post.price && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-gradient-to-r from-emerald-500/90 to-green-500/90 text-white px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-lg shadow-lg">
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    ${post.price}
                  </Badge>
                </div>
              )}

              {/* AI Generated Badge */}
              {post.aiGenerated && (
                <div className="absolute top-2 left-10">
                  <Badge className="bg-gradient-to-r from-purple-500/90 to-violet-500/90 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-lg shadow-lg">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full aspect-square bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center rounded-2xl">
              <ImageIcon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
            </div>
          )}

          {/* Content - COMPACT DESIGN - TRANSPARENT BACKGROUND */}
          <div className="p-3 bg-transparent">
            {/* Author */}
            <div className="flex items-center justify-between mb-2">
              <Link href={`/profile/${post.author?.username}`} className="flex items-center space-x-2 group/author flex-1 min-w-0">
                <div className="relative">
                  <Avatar className="w-8 h-8 border-2 border-white/50 dark:border-slate-700/50 shadow-md group-hover/author:scale-105 transition-transform duration-300">
                    <AvatarImage src={post.author?.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white text-xs font-semibold">
                      {post.author?.firstName?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {post.author?.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full p-0.5 border-2 border-white/50 dark:border-slate-700/50">
                      <Verified className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 dark:text-white truncate group-hover/author:text-rose-600 transition-colors">
                    {post.author?.firstName || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {getTimeAgo(post.createdAt)}
                  </p>
                </div>
              </Link>
              
              <div className="relative" ref={optionsRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setState(prev => ({ ...prev, showOptionsMenu: !prev.showOptionsMenu }))}
                  className="w-7 h-7 rounded-lg bg-black/20 dark:bg-slate-700/50 hover:bg-black/30 dark:hover:bg-slate-600/50 backdrop-blur-sm"
                >
                  <MoreVertical className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                </Button>

                <AnimatePresence>
                  {state.showOptionsMenu && (
                    <OptionsMenu
                      post={post}
                      currentUserId={userId}
                      isFollowing={state.isFollowing}
                      onFollow={handleFollow}
                      onEdit={() => setState(prev => ({ ...prev, showEditModal: true }))}
                      onDelete={() => setState(prev => ({ ...prev, showDeleteConfirm: true }))}
                      onReport={onReport}
                      onClose={() => setState(prev => ({ ...prev, showOptionsMenu: false }))}
                      actionLoading={actionLoading}
                      isSignedIn={isSignedIn}
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Caption */}
            {post.caption && (
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 line-clamp-2 leading-relaxed">
                {post.caption}
              </p>
            )}

            {/* Stats - Compact and beautiful */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLike}
                    disabled={!isSignedIn || actionLoading.like}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all duration-300 hover:scale-110 p-0",
                      state.isLiked 
                        ? "bg-gradient-to-br from-rose-500/20 to-pink-500/20 text-rose-500" 
                        : "bg-transparent text-slate-500 hover:text-rose-500"
                    )}
                  >
                    <Heart className={cn("w-3.5 h-3.5", state.isLiked && "fill-current")} />
                  </Button>
                  <span className="font-medium text-xs text-slate-800 dark:text-white min-w-[24px]">
                    {formatNumber(state.likeCount)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/posts/${post._id}#comments`)}
                    className="w-6 h-6 rounded-full bg-transparent text-slate-500 hover:text-blue-500 transition-all duration-300 hover:scale-110 p-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </Button>
                  <span className="font-medium text-xs text-slate-800 dark:text-white min-w-[24px]">
                    {formatNumber(state.commentCount)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSave}
                    disabled={!isSignedIn || actionLoading.save}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all duration-300 hover:scale-110 p-0",
                      state.isSaved 
                        ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20 text-amber-500" 
                        : "bg-transparent text-slate-500 hover:text-amber-500"
                    )}
                  >
                    <Bookmark className={cn("w-3.5 h-3.5", state.isSaved && "fill-current")} />
                  </Button>
                  <span className="font-medium text-xs text-slate-800 dark:text-white min-w-[24px]">
                    {formatNumber(state.saveCount)}
                  </span>
                </div>
              </div>
              
              {post.category && (
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {post.category}
                </span>
              )}
            </div>

            {/* Hashtags */}
            {post.hashtags && Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.hashtags.slice(0, 2).map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => onHashtagClick?.(tag)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium px-1.5 py-0.5 rounded-full bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
                  >
                    #{tag}
                  </button>
                ))}
                {post.hashtags.length > 2 && (
                  <span className="text-xs text-slate-500 px-1.5 py-0.5">
                    +{post.hashtags.length - 2} more
                  </span>
                )}
              </div>
            )}
          </div>
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
    )
  }

  // 2. Grid View - PHOTO ONLY (No details, transparent)
  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ 
          scale: 1.05,
          transition: { duration: 0.3, type: "spring", stiffness: 200 }
        }}
        transition={{ duration: 0.3 }}
        className={cn("group relative", className)}
      >
        <div className="relative overflow-hidden rounded-2xl bg-transparent shadow-lg hover:shadow-2xl transition-all duration-500">
          {/* Photo Only - No details shown */}
          {hasMedia ? (
            <div 
              className="relative aspect-square overflow-hidden rounded-2xl"
              onMouseEnter={() => setState(prev => ({ ...prev, isHovered: true }))}
              onMouseLeave={() => setState(prev => ({ ...prev, isHovered: false }))}
            >
              <Link href={`/posts/${post._id}`}>
                {currentMedia?.type === 'video' ? (
                  <div className="relative w-full h-full">
                    <video
                      ref={videoRef}
                      src={currentMedia.url}
                      className="w-full h-full object-cover"
                      muted={state.isMuted}
                      loop
                    />
                    {/* Video Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Play className="w-10 h-10 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {!state.imageLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-600 dark:to-slate-500 animate-pulse" />
                    )}
                    <img
                      src={currentMedia?.url || '/placeholder.png'}
                      alt={post.caption}
                      className={cn(
                        "w-full h-full object-cover transition-all duration-700",
                        state.imageLoaded ? 'group-hover:scale-110 brightness-95 group-hover:brightness-100' : 'opacity-0'
                      )}
                      onLoad={() => setState(prev => ({ ...prev, imageLoaded: true }))}
                    />
                  </div>
                )}
              </Link>

              {/* Multiple Media Indicator */}
              {mediaArray.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center backdrop-blur-lg shadow-lg">
                  <Grid3x3 className="w-3 h-3 mr-1" />
                  {mediaArray.length}
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Floating Stats */}
              <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center justify-between text-white text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <Heart className={cn("w-3.5 h-3.5", state.isLiked && "fill-current")} />
                      <span className="font-medium">{formatNumber(state.likeCount)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="font-medium">{formatNumber(state.commentCount)}</span>
                    </div>
                  </div>
                  
                  {post.availableForSale && post.price && (
                    <Badge className="bg-gradient-to-r from-emerald-500/90 to-green-500/90 text-white px-2 py-0.5 text-xs font-medium">
                      ${post.price}
                    </Badge>
                  )}
                </div>
              </div>

              {/* AI Generated Badge */}
              {post.aiGenerated && (
                <div className="absolute top-2 left-2">
                  <Badge className="bg-gradient-to-r from-purple-500/90 to-violet-500/90 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-lg shadow-lg">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Badge>
                </div>
              )}

              {/* Purchase Badge */}
              {post.availableForSale && post.price && (
                <div className="absolute top-2 left-10">
                  <Badge className="bg-gradient-to-r from-emerald-500/90 to-green-500/90 text-white px-2 py-0.5 rounded-full text-xs font-semibold backdrop-blur-lg shadow-lg">
                    <ShoppingBag className="w-3 h-3 mr-1" />
                    ${post.price}
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center rounded-2xl">
              <ImageIcon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
            </div>
          )}

          {/* NO DETAILS SECTION - Grid view shows only photo */}
        </div>
      </motion.div>
    )
  }

  // Default to masonry view if viewMode not specified
  return null;
}

// Options Menu Component
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
      className="absolute right-0 top-full mt-2 w-64 bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 z-50 py-3 backdrop-blur-xl"
    >
      {isAuthor ? (
        <>
          <button
            onClick={() => { onEdit(); onClose(); }}
            className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors rounded-xl mx-2"
          >
            <Edit className="w-4 h-4 text-blue-500" />
            <span>Edit Post</span>
          </button>
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="flex items-center space-x-3 w-full px-5 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-xl mx-2"
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
            className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors rounded-xl mx-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading.follow ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : isFollowing ? (
              <UserCheck className="w-4 h-4 text-green-600" />
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
            className="flex items-center space-x-3 w-full px-5 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-xl mx-2"
          >
            <Flag className="w-4 h-4" />
            <span>Report Post</span>
          </button>
        </>
      )}
      <div className="h-px bg-white/20 dark:bg-slate-700/50 my-2" />
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
            console.error('Failed to copy link:', error)
            toast({
              title: "Error",
              description: "Failed to copy link",
              variant: "destructive"
            })
          }
        }}
        className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors rounded-xl mx-2"
      >
        <Copy className="w-4 h-4 text-slate-500" />
        <span>Copy Link</span>
      </button>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(post.caption)
            toast({
              title: "Copied!",
              description: "Caption copied to clipboard",
            })
            onClose()
          } catch (error) {
            console.error('Failed to copy caption:', error)
          }
        }}
        className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors rounded-xl mx-2"
      >
        <Copy className="w-4 h-4 text-slate-500" />
        <span>Copy Caption</span>
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
      className="absolute left-0 bottom-full mb-2 w-56 bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 z-50 py-3 backdrop-blur-xl"
    >
      <button
        onClick={() => onShare('social')}
        className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors rounded-xl mx-2"
      >
        <Share2 className="w-4 h-4 text-green-500" />
        <span>Share via...</span>
      </button>
      <button
        onClick={() => onShare('link')}
        className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors rounded-xl mx-2"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-green-600">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-slate-500" />
            <span>Copy Link</span>
          </>
        )}
      </button>
      <div className="h-px bg-white/20 dark:bg-slate-700/50 my-2" />
      <button
        onClick={async () => {
          try {
            if (!currentMedia?.url) {
              throw new Error('No media available')
            }
            const image = await fetch(currentMedia.url)
            const imageBlog = await image.blob()
            const imageURL = URL.createObjectURL(imageBlog)
            const link = document.createElement('a')
            link.href = imageURL
            link.download = `post-${post._id}.${currentMedia?.type === 'video' ? 'mp4' : 'jpg'}`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            onClose()
          } catch (error) {
            console.error('Download failed:', error)
            toast({
              title: "Download failed",
              description: "Failed to download media",
              variant: "destructive"
            })
          }
        }}
        className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors rounded-xl mx-2"
      >
        <DownloadCloud className="w-4 h-4 text-blue-500" />
        <span>Download Media</span>
      </button>
    </motion.div>
  )
}