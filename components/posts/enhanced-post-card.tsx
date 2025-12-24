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
  ExternalLink as LinkIcon
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
      console.log('EnhancedPostCard: Fetching statuses for:', { 
        postId: post._id, 
        userIds: [post.author?._id] 
      })
      
      // If not signed in, we can't fetch user-specific statuses
      if (!isSignedIn) {
        console.log('EnhancedPostCard: Not signed in, initializing from post data')
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
        console.log('EnhancedPostCard: Statuses fetched:', data)
        
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
          console.log('EnhancedPostCard: Batch API failed, falling back to post data')
          initializeFromPostData()
        }
      } else {
        console.error('EnhancedPostCard: Failed to fetch statuses:', response.status)
        // Fallback to post data
        initializeFromPostData()
      }
    } catch (error) {
      console.error('EnhancedPostCard: Error fetching statuses:', error)
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
    
    console.log('EnhancedPostCard: Initializing from post data:', { liked, saved, following, userId })
    
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
      console.log('EnhancedPostCard: Using batch status data from props:', batchStatusData)
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
      console.log('EnhancedPostCard: User loaded, fetching statuses')
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
    if (actionLoading.like || !post._id) {
      console.log("EnhancedPostCard: Like prevented: no post or already liking")
      return
    }

    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to like posts",
        variant: "destructive"
      })
      return
    }

    console.log("EnhancedPostCard: Starting like action:", { postId: post._id, userId })

    // Get current like status from statuses (most accurate)
    const wasLiked = statuses.likeStatuses[post._id] || state.isLiked
    console.log("EnhancedPostCard: Previous like status:", { wasLiked, fromStatuses: statuses.likeStatuses[post._id], fromState: state.isLiked })

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
        console.log("EnhancedPostCard: Like API success:", data)

        if (data.success) {
          // Refresh statuses to ensure consistency
          await fetchStatuses()
        } else {
          throw new Error(data.error || 'Like failed')
        }
      }
    } catch (error: any) {
      // Revert on error
      console.error("EnhancedPostCard: Error in like:", error)
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
    if (actionLoading.save || !post._id) {
      return
    }

    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to save posts",
        variant: "destructive"
      })
      return
    }

    console.log("EnhancedPostCard: Starting save action:", { postId: post._id, userId })
    
    // Get current save status from statuses (most accurate)
    const wasSaved = statuses.saveStatuses[post._id]?.saved || state.isSaved
    console.log("EnhancedPostCard: Previous save status:", { wasSaved, fromStatuses: statuses.saveStatuses[post._id]?.saved, fromState: state.isSaved })

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
        console.log('EnhancedPostCard: Save API success:', data)

        if (data.success) {
          // Refresh statuses to ensure consistency
          await fetchStatuses()
        } else {
          throw new Error(data.error || 'Save failed')
        }
      }
    } catch (error: any) {
      // Revert on error
      console.error("EnhancedPostCard: Error in save:", error)
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
    if (actionLoading.follow || !post.author?._id) {
      console.log("EnhancedPostCard: Follow prevented: No author ID")
      return
    }

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

    console.log("EnhancedPostCard: Starting follow action:", {
      authorId,
      userId,
      previousIsFollowing,
      previousFollowerCount,
      fromStatuses: statuses.followStatuses[authorId],
      fromState: state.isFollowing
    })

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
        console.log("EnhancedPostCard: Follow API success:", result)

        if (!result.success) {
          throw new Error(result.error || "Follow request failed")
        }

        // Refresh statuses to ensure consistency
        await fetchStatuses()
      }
    } catch (error: any) {
      console.error("EnhancedPostCard: Error following user:", error)

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
    if (!state.commentText.trim() || actionLoading.comment || !post._id || !isSignedIn) {
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
    userId, 
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

  // Get follower count with optimistic updates
  const getFollowerCount = () => {
    return optimisticFollowers > 0 ? optimisticFollowers : 
      (Array.isArray(post.author?.followers) ? post.author.followers.length : 0)
  }

  // Current media item - safe access
  const currentMedia = post.media?.[state.currentMediaIndex] || post.media?.[0]
  const mediaArray = Array.isArray(post.media) ? post.media : []
  const hasMedia = mediaArray.length > 0

  // Get safe comments array
  const commentsArray = useMemo(() => getCommentsArray(post.comments), [post.comments])

  // Debug log for initial state
  useEffect(() => {
    console.log('EnhancedPostCard Debug:', {
      postId: post._id,
      userId,
      isSignedIn,
      userLoaded,
      state: {
        isLiked: state.isLiked,
        isSaved: state.isSaved,
        isFollowing: state.isFollowing,
        isLoadingStatus: state.isLoadingStatus
      },
      statuses: {
        likeStatuses: statuses.likeStatuses[post._id],
        saveStatuses: statuses.saveStatuses[post._id]?.saved,
        followStatuses: statuses.followStatuses[post.author?._id]
      },
      postData: {
        likes: post.likes,
        saves: post.saves,
        authorFollowers: post.author?.followers,
        comments: commentsArray.length
      }
    })
  }, [post._id, userId, isSignedIn, userLoaded, state, statuses, post.likes, post.saves, post.author?.followers, commentsArray])

  // ==============================================
  // BEAUTIFUL VIEW MODES
  // ==============================================

  // 1. Pinterest-style Masonry Grid View (Most Beautiful - Default)
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-200/50 dark:border-slate-700/50">
          {/* Media Container */}
          {hasMedia ? (
            <div 
              className="relative overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600"
              onMouseEnter={() => setState(prev => ({ ...prev, isHovered: true, showQuickActions: true }))}
              onMouseLeave={() => setState(prev => ({ ...prev, isHovered: false, showQuickActions: false }))}
            >
              <Link href={`/posts/${post._id}`}>
                {currentMedia?.type === 'video' ? (
                  <div className="relative w-full aspect-[4/5]">
                    <video
                      ref={videoRef}
                      src={currentMedia.url}
                      className="w-full h-full object-cover"
                      muted={state.isMuted}
                      loop
                    />
                    {/* Video Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-1.5 mb-3">
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
                        className="w-16 h-16 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-lg text-white rounded-2xl hover:from-white/30 hover:to-white/20 hover:scale-110 transition-all shadow-2xl"
                      >
                        {state.isPlaying ? 
                          <Pause className="w-7 h-7" /> : 
                          <Play className="w-7 h-7 ml-1" />
                        }
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full aspect-[4/5]">
                    {!state.imageLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 animate-pulse" />
                    )}
                    <img
                      src={currentMedia?.url || '/placeholder.png'}
                      alt={post.caption}
                      className={cn(
                        "w-full h-full object-cover transition-all duration-700",
                        state.imageLoaded ? 'group-hover:scale-110' : 'opacity-0',
                        "brightness-95 hover:brightness-100"
                      )}
                      onLoad={() => setState(prev => ({ ...prev, imageLoaded: true }))}
                    />
                  </div>
                )}
              </Link>

              {/* Multiple Media Indicator */}
              {mediaArray.length > 1 && (
                <div className="absolute top-3 right-3 bg-gradient-to-br from-black/80 to-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center backdrop-blur-lg shadow-lg">
                  <Grid3x3 className="w-3.5 h-3.5 mr-1.5" />
                  <span className="font-medium">{mediaArray.length}</span>
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Quick Actions Overlay */}
              <AnimatePresence>
                {state.isHovered && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            handleLike()
                          }}
                          disabled={!isSignedIn || actionLoading.like}
                          className={cn(
                            "w-12 h-12 rounded-2xl backdrop-blur-lg transition-all duration-300 hover:scale-110",
                            state.isLiked 
                              ? "bg-gradient-to-br from-rose-500/30 to-pink-500/30 text-rose-400 hover:from-rose-500/40 hover:to-pink-500/40" 
                              : "bg-white/20 text-white hover:bg-white/30",
                            !isSignedIn && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {actionLoading.like ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Heart className={cn("w-5 h-5", state.isLiked && "fill-current")} />
                          )}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            router.push(`/posts/${post._id}#comments`)
                          }}
                          className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 hover:scale-110 transition-all duration-300"
                        >
                          <MessageCircle className="w-5 h-5" />
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
                            "w-12 h-12 rounded-2xl backdrop-blur-lg transition-all duration-300 hover:scale-110",
                            state.isSaved 
                              ? "bg-gradient-to-br from-amber-500/30 to-yellow-500/30 text-amber-400 hover:from-amber-500/40 hover:to-yellow-500/40" 
                              : "bg-white/20 text-white hover:bg-white/30",
                            !isSignedIn && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {actionLoading.save ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Bookmark className={cn("w-5 h-5", state.isSaved && "fill-current")} />
                          )}
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault()
                          handleShare('social')
                        }}
                        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 backdrop-blur-lg text-white hover:from-green-500/40 hover:to-emerald-500/40 hover:scale-110 transition-all duration-300"
                      >
                        <Share2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stats Badge */}
              <div className="absolute top-3 left-3">
                <div className="flex items-center space-x-1 bg-gradient-to-br from-black/80 to-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-lg shadow-lg">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="font-medium">{formatNumber(post.views || 0)}</span>
                </div>
              </div>

              {/* Purchase Badge */}
              {post.availableForSale && post.price && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-3 left-3 mt-10"
                >
                  <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-lg shadow-lg border-0">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    ${post.price}
                  </Badge>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="relative aspect-[4/5] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
              <ImageIcon className="w-20 h-20 text-slate-400 dark:text-slate-500" />
            </div>
          )}

          {/* Content */}
          <div className="p-5 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
            {/* Author */}
            <div className="flex items-center justify-between mb-4">
              <Link href={`/profile/${post.author?.username}`} className="flex items-center space-x-3 group/author flex-1 min-w-0">
                <div className="relative">
                  <Avatar className="w-10 h-10 border-2 border-white dark:border-slate-800 shadow-lg group-hover/author:scale-105 transition-transform duration-300">
                    <AvatarImage src={post.author?.avatar} />
                    <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white font-semibold">
                      {post.author?.firstName?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {post.author?.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full p-1 border-2 border-white dark:border-slate-800">
                      <Verified className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {post.author?.isPro && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-1 border-2 border-white dark:border-slate-800">
                      <Crown className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-semibold text-slate-900 dark:text-white group-hover/author:text-rose-600 transition-colors truncate">
                      {post.author?.firstName || 'User'} {post.author?.lastName || ''}
                    </p>
                    {post.author?.badges?.slice(0, 1).map((badge, index) => (
                      <Badge key={index} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTimeAgo(post.createdAt)}
                  </p>
                </div>
              </Link>
              
              <div className="relative" ref={optionsRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setState(prev => ({ ...prev, showOptionsMenu: !prev.showOptionsMenu }))}
                  className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  <MoreHorizontal className="w-4 h-4" />
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
            <p className={cn(
              "text-sm text-slate-700 dark:text-slate-300 mb-4 line-clamp-3 leading-relaxed",
              !state.showFullCaption && "line-clamp-2"
            )}>
              {post.caption}
            </p>

            {/* Stats */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full",
                    state.isLiked 
                      ? "bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20" 
                      : "bg-slate-100 dark:bg-slate-700"
                  )}>
                    <Heart className={cn(
                      "w-4 h-4",
                      state.isLiked ? "text-rose-500 fill-current" : "text-slate-500"
                    )} />
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatNumber(state.likeCount)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700">
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatNumber(state.commentCount)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1.5">
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full",
                    state.isSaved 
                      ? "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20" 
                      : "bg-slate-100 dark:bg-slate-700"
                  )}>
                    <Bookmark className={cn(
                      "w-4 h-4",
                      state.isSaved ? "text-amber-500 fill-current" : "text-slate-500"
                    )} />
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatNumber(state.saveCount)}
                  </span>
                </div>
              </div>
              
              {post.category && (
                <Badge variant="outline" className="text-xs px-3 py-1 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                  {post.category}
                </Badge>
              )}
            </div>

            {/* Hashtags */}
            {post.hashtags && Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.hashtags.slice(0, 3).map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => onHashtagClick?.(tag)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    #{tag}
                  </button>
                ))}
                {post.hashtags.length > 3 && (
                  <span className="text-xs text-slate-500 px-2 py-1">
                    +{post.hashtags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // 2. Beautiful Grid View
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/50 dark:border-slate-700/50">
          {/* Media Container - Square for grid */}
          {hasMedia ? (
            <div 
              className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600"
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
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 animate-pulse" />
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
                <div className="absolute top-2 right-2 bg-gradient-to-br from-black/80 to-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center backdrop-blur-lg shadow-lg">
                  <Grid3x3 className="w-3 h-3 mr-1" />
                  {mediaArray.length}
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

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
                    <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-2 py-0.5 text-xs font-medium">
                      ${post.price}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-square bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-slate-400 dark:text-slate-500" />
            </div>
          )}

          {/* Minimal Content */}
          <div className="p-3 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
            <div className="flex items-center space-x-2 mb-2">
              <Link href={`/profile/${post.author?.username}`}>
                <Avatar className="w-7 h-7 border border-slate-200 dark:border-slate-700">
                  <AvatarImage src={post.author?.avatar} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                    {post.author?.firstName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${post.author?.username}`}>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate hover:text-rose-600 transition-colors">
                    {post.author?.firstName || 'User'}
                  </p>
                </Link>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center">
                  <Clock className="w-2.5 h-2.5 mr-1" />
                  {getTimeAgo(post.createdAt)}
                </p>
              </div>
            </div>
            
            {/* Truncated caption */}
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed">
              {post.caption}
            </p>
            
            {/* Hashtags */}
            {post.hashtags && Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.hashtags.slice(0, 2).map((tag, index) => (
                  <span key={index} className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // 3. Elegant Feed View (Instagram-style)
  if (viewMode === 'feed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn("group", className)}
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-xl hover:shadow-2xl transition-all duration-500 border border-slate-200/50 dark:border-slate-700/50">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <Link href={`/profile/${post.author.username}`} className="flex items-center space-x-3 group/author flex-1">
                <div className="relative">
                  <Avatar className="w-11 h-11 border-2 border-white dark:border-slate-800 shadow-lg">
                    <AvatarImage src={post.author.avatar} alt={post.author.username} />
                    <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white font-semibold">
                      {post.author.firstName?.[0]}{post.author.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {post.author.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full p-1 border-2 border-white dark:border-slate-800">
                      <Verified className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold text-slate-900 dark:text-white group-hover/author:text-rose-600 transition-colors truncate">
                      {post.author.firstName} {post.author.lastName}
                    </p>
                    {post.author.isPro && (
                      <Crown className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span>@{post.author.username}</span>
                    <span>•</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {getTimeAgo(post.createdAt)}
                    </span>
                  </div>
                </div>
              </Link>

              <div className="relative" ref={optionsRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setState(prev => ({ ...prev, showOptionsMenu: !prev.showOptionsMenu }))}
                  className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  <MoreHorizontal className="w-4 h-4" />
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

            {post.location && (
              <div className="flex items-center space-x-1 text-xs text-slate-500 mt-3">
                <MapPin className="w-3 h-3" />
                <span>{post.location}</span>
              </div>
            )}
          </div>

          {/* Media */}
          <div 
            className="relative aspect-square bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 overflow-hidden"
            onMouseEnter={() => setState(prev => ({ ...prev, isHovered: true }))}
            onMouseLeave={() => setState(prev => ({ ...prev, isHovered: false }))}
          >
            {currentMedia?.type === 'video' ? (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  src={currentMedia.url}
                  className="w-full h-full object-cover"
                  muted={state.isMuted}
                  loop
                />
                {/* Video Controls */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-all duration-300",
                  (state.isHovered || state.isPlaying) ? "opacity-100" : "opacity-0"
                )}>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-1.5 mb-3">
                      <div 
                        className="bg-gradient-to-r from-rose-500 to-pink-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${state.videoProgress}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={togglePlay}
                        className="w-9 h-9 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:scale-110 transition-all"
                      >
                        {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-9 h-9 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:scale-110 transition-all"
                        onClick={() => window.open(currentMedia.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Link href={`/posts/${post._id}`}>
                <div className="relative w-full h-full">
                  {!state.imageLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 animate-pulse" />
                  )}
                  <img
                    src={currentMedia?.url || '/placeholder.png'}
                    alt={post.caption}
                    className={cn(
                      "w-full h-full object-cover transition-all duration-700",
                      state.imageLoaded ? 'opacity-100' : 'opacity-0'
                    )}
                    onLoad={() => setState(prev => ({ ...prev, imageLoaded: true }))}
                  />
                </div>
              </Link>
            )}

            {/* Multiple Media Indicator */}
            {mediaArray.length > 1 && (
              <div className="absolute top-4 right-4 bg-gradient-to-br from-black/80 to-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center backdrop-blur-lg shadow-lg">
                <Grid3x3 className="w-3.5 h-3.5 mr-1.5" />
                <span className="font-medium">{mediaArray.length}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLike}
                  disabled={actionLoading.like || !isSignedIn}
                  className={cn(
                    "w-11 h-11 rounded-2xl transition-all duration-300 group/like",
                    state.isLiked
                      ? "bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 text-rose-500 hover:from-rose-100 dark:hover:from-rose-900/30"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-600",
                    !isSignedIn && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {actionLoading.like ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Heart className={cn(
                      "w-5 h-5 transition-all duration-300",
                      state.isLiked && "fill-current"
                    )} />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setState(prev => ({ ...prev, showComments: !prev.showComments }))}
                  className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300"
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>

                <div className="relative" ref={shareRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setState(prev => ({ ...prev, showShareMenu: !prev.showShareMenu }))}
                    className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-green-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>

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
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                disabled={actionLoading.save || !isSignedIn}
                className={cn(
                  "w-11 h-11 rounded-2xl transition-all duration-300",
                  state.isSaved
                    ? "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 text-amber-500 hover:from-amber-100 dark:hover:from-amber-900/30"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-600",
                  !isSignedIn && "opacity-50 cursor-not-allowed"
                )}
              >
                {actionLoading.save ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Bookmark className={cn(
                    "w-5 h-5",
                    state.isSaved && "fill-current"
                  )} />
                )}
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6 text-sm text-slate-600 dark:text-slate-400 mb-4">
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatNumber(state.likeCount)} likes
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatNumber(state.commentCount)} comments
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatNumber(state.saveCount)} saves
              </span>
            </div>

            {/* Caption */}
            <div className="mb-4">
              <div className="flex items-start space-x-2">
                <Link href={`/profile/${post.author.username}`}>
                  <span className="font-bold text-slate-900 dark:text-white hover:text-rose-600 transition-colors cursor-pointer text-sm">
                    {post.author.username}
                  </span>
                </Link>
                <div className="flex-1">
                  <p className={cn(
                    "text-slate-700 dark:text-slate-300 text-sm leading-relaxed",
                    !state.showFullCaption && "line-clamp-2"
                  )}>
                    {post.caption}
                  </p>
                  {post.caption && post.caption.length > 150 && (
                    <button
                      onClick={() => setState(prev => ({ ...prev, showFullCaption: !prev.showFullCaption }))}
                      className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium mt-1 transition-colors"
                    >
                      {state.showFullCaption ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.hashtags.slice(0, 5).map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => onHashtagClick?.(tag)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Comments Section */}
            <AnimatePresence>
              {state.showComments && (
                <CommentsSection
                  post={post}
                  commentsArray={commentsArray}
                  onComment={handleCommentSubmit}
                  commentText={state.commentText}
                  setCommentText={(text) => setState(prev => ({ ...prev, commentText: text }))}
                  loading={actionLoading.comment}
                  currentUserId={userId}
                  isSignedIn={isSignedIn}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    )
  }

  // 4. Detailed View (Full-featured) - Default for profile pages
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, type: "spring" }}
      className={cn("group", className)}
    >
      <div className={cn(
        "relative overflow-hidden rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-2xl border border-slate-200/50 dark:border-slate-700/50",
        featured && "ring-2 ring-amber-300/30 dark:ring-amber-600/30",
        post.isSponsored && "ring-2 ring-blue-300/30 dark:ring-blue-600/30"
      )}>

        {/* Header with gradient */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-white via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/profile/${post.author.username}`}>
                <div className="relative">
                  <Avatar className="w-12 h-12 border-3 border-white dark:border-slate-800 shadow-xl">
                    <AvatarImage src={post.author.avatar} alt={post.author.username} />
                    <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white font-bold text-sm">
                      {post.author.firstName?.[0]}{post.author.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {post.author.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full p-1.5 border-3 border-white dark:border-slate-800">
                      <Verified className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {post.author.isPro && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-1.5 border-3 border-white dark:border-slate-800">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <Link href={`/profile/${post.author.username}`}>
                    <p className="font-bold text-slate-900 dark:text-white hover:text-rose-600 transition-colors truncate text-sm">
                      {post.author.firstName} {post.author.lastName}
                    </p>
                  </Link>
                  {post.isSponsored && (
                    <Badge variant="default" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-3 py-1">
                      Sponsored
                    </Badge>
                  )}
                  {post.isFeatured && (
                    <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs px-3 py-1">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Featured
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>@{post.author.username}</span>
                  <span>•</span>
                  <span className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTimeAgo(post.createdAt)}
                  </span>
                  {post.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {post.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="relative" ref={optionsRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setState(prev => ({ ...prev, showOptionsMenu: !prev.showOptionsMenu }))}
                className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
              >
                <MoreHorizontal className="w-4 h-4" />
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
        </div>

        {/* Media Carousel */}
        <div 
          ref={containerRef}
          className="relative aspect-square bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 overflow-hidden"
          onMouseEnter={() => setState(prev => ({ ...prev, isHovered: true }))}
          onMouseLeave={() => setState(prev => ({ ...prev, isHovered: false }))}
        >
          {/* Media Items */}
          {post.media.map((media, index) => (
            <div
              key={media.publicId || index}
              className={cn(
                "absolute inset-0 transition-all duration-500",
                index === state.currentMediaIndex ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              {media.type === 'video' ? (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    src={media.url}
                    className="w-full h-full object-cover"
                    muted={state.isMuted}
                    loop
                    onTimeUpdate={handleVideoProgress}
                    onEnded={() => setState(prev => ({ ...prev, isPlaying: false }))}
                  />
                  
                  {/* Video Controls */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-all duration-300",
                    (state.isHovered || state.isPlaying) ? "opacity-100" : "opacity-0"
                  )}>
                    <div className="absolute bottom-6 left-6 right-6">
                      {/* Progress Bar */}
                      <div className="w-full bg-white/20 backdrop-blur-sm rounded-full h-2 mb-4">
                        <div 
                          className="bg-gradient-to-r from-rose-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${state.videoProgress}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={togglePlay}
                            className="w-12 h-12 bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 hover:scale-110 transition-all rounded-2xl"
                          >
                            {state.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMute}
                            className="w-12 h-12 bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 hover:scale-110 transition-all rounded-2xl"
                          >
                            {state.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </Button>
                          {media.duration && (
                            <span className="text-white text-sm font-medium">
                              {new Date(media.duration * 1000).toISOString().substr(14, 5)}
                            </span>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-12 h-12 bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 hover:scale-110 transition-all rounded-2xl"
                          onClick={() => window.open(media.url, '_blank')}
                        >
                          <ExternalLink className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link href={`/posts/${post._id}`}>
                  <div className="relative w-full h-full">
                    {!state.imageLoaded && index === state.currentMediaIndex && (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 animate-pulse" />
                    )}
                    <img
                      src={media.url}
                      alt={media.alt || post.caption}
                      className={cn(
                        "w-full h-full object-cover transition-all duration-700",
                        state.imageLoaded && index === state.currentMediaIndex ? 'opacity-100' : 'opacity-0'
                      )}
                      onLoad={() => index === state.currentMediaIndex && setState(prev => ({ ...prev, imageLoaded: true }))}
                    />
                  </div>
                </Link>
              )}
            </div>
          ))}

          {/* Media Navigation */}
          {post.media.length > 1 && (
            <>
              <button
                onClick={prevMedia}
                className="absolute left-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-lg text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/70 hover:scale-110"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMedia}
                className="absolute right-6 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/50 backdrop-blur-lg text-white rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/70 hover:scale-110"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              {/* Media Indicators */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {post.media.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setState(prev => ({ ...prev, currentMediaIndex: index }))}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300 backdrop-blur-sm",
                      index === state.currentMediaIndex 
                        ? "bg-white w-8 shadow-lg" 
                        : "bg-white/50 hover:bg-white/80"
                    )}
                  />
                ))}
              </div>
            </>
          )}

          {/* Media Type Badges */}
          <div className="absolute top-6 left-6 flex flex-wrap gap-2">
            {post.media[state.currentMediaIndex]?.type === 'video' && (
              <Badge className="rounded-full bg-gradient-to-r from-purple-500 to-violet-500 text-white backdrop-blur-lg border-0 px-4 py-1.5">
                <Video className="w-4 h-4 mr-2" />
                Video
              </Badge>
            )}
            {post.media.length > 1 && (
              <Badge className="rounded-full bg-gradient-to-r from-slate-600 to-slate-500 text-white backdrop-blur-lg border-0 px-4 py-1.5">
                <Grid3x3 className="w-4 h-4 mr-2" />
                {state.currentMediaIndex + 1}/{post.media.length}
              </Badge>
            )}
            {post.aiGenerated && (
              <Badge className="rounded-full bg-gradient-to-r from-purple-500 to-violet-500 text-white backdrop-blur-lg border-0 px-4 py-1.5">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generated
              </Badge>
            )}
          </div>

          {/* Purchase Overlay */}
          {post.availableForSale && post.price && (
            <div className="absolute top-6 right-6">
              <Button
                onClick={() => onPurchase?.(post._id)}
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 backdrop-blur-lg rounded-2xl px-6 py-3"
              >
                <ShoppingBag className="w-5 h-5 mr-3" />
                Buy • ${post.price} {post.currency}
              </Button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6">
          {/* Actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLike}
                disabled={actionLoading.like || !isSignedIn}
                className={cn(
                  "w-14 h-14 rounded-2xl transition-all duration-300 group/like",
                  state.isLiked
                    ? "bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 text-rose-500 hover:from-rose-100 dark:hover:from-rose-900/30"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-600",
                  !isSignedIn && "opacity-50 cursor-not-allowed"
                )}
              >
                {actionLoading.like ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Heart className={cn(
                    "w-6 h-6 transition-all duration-300",
                    state.isLiked && "fill-current"
                  )} />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setState(prev => ({ ...prev, showComments: !prev.showComments }))}
                className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300"
              >
                <MessageCircle className="w-6 h-6" />
              </Button>

              <div className="relative" ref={shareRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setState(prev => ({ ...prev, showShareMenu: !prev.showShareMenu }))}
                  className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-green-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300"
                >
                  <Share2 className="w-6 h-6" />
                </Button>

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
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={actionLoading.save || !isSignedIn}
              className={cn(
                "w-14 h-14 rounded-2xl transition-all duration-300",
                state.isSaved
                  ? "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 text-amber-500 hover:from-amber-100 dark:hover:from-amber-900/30"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-600",
                !isSignedIn && "opacity-50 cursor-not-allowed"
              )}
            >
              {actionLoading.save ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Bookmark className={cn(
                  "w-6 h-6",
                  state.isSaved && "fill-current"
                )} />
              )}
            </Button>
          </div>

          {/* Stats */}
          {showEngagement && (
            <div className="flex items-center space-x-8 text-sm text-slate-600 dark:text-slate-400 mb-6">
              <button
                onClick={() => setState(prev => ({ ...prev, showEngagementStats: true }))}
                className="hover:text-slate-900 dark:hover:text-white transition-colors font-semibold text-slate-900 dark:text-white"
              >
                <span className="font-bold text-lg">{formatNumber(state.likeCount)}</span> likes
              </button>
              <button
                onClick={() => setState(prev => ({ ...prev, showComments: true }))}
                className="hover:text-slate-900 dark:hover:text-white transition-colors font-semibold text-slate-900 dark:text-white"
              >
                <span className="font-bold text-lg">{formatNumber(state.commentCount)}</span> comments
              </button>
              <button className="hover:text-slate-900 dark:hover:text-white transition-colors font-semibold text-slate-900 dark:text-white">
                <span className="font-bold text-lg">{formatNumber(state.saveCount)}</span> saves
              </button>
            </div>
          )}

          {/* Caption */}
          <div className="mb-6">
            <div className="flex items-start space-x-3">
              <Link href={`/profile/${post.author.username}`}>
                <span className="font-bold text-slate-900 dark:text-white hover:text-rose-600 transition-colors cursor-pointer text-sm">
                  {post.author.username}
                </span>
              </Link>
              <div className="flex-1">
                <p className={cn(
                  "text-slate-700 dark:text-slate-300 text-sm leading-relaxed",
                  !state.showFullCaption && "line-clamp-3"
                )}>
                  {post.caption}
                </p>
                {post.caption && post.caption.length > 150 && (
                  <button
                    onClick={() => setState(prev => ({ ...prev, showFullCaption: !prev.showFullCaption }))}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium mt-2 transition-colors"
                  >
                    {state.showFullCaption ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.hashtags.slice(0, 6).map((tag, index) => (
                <button
                  key={index}
                  onClick={() => onHashtagClick?.(tag)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Comments Section */}
          <AnimatePresence>
            {state.showComments && (
              <CommentsSection
                post={post}
                commentsArray={commentsArray}
                onComment={handleCommentSubmit}
                commentText={state.commentText}
                setCommentText={(text) => setState(prev => ({ ...prev, commentText: text }))}
                loading={actionLoading.comment}
                currentUserId={userId}
                isSignedIn={isSignedIn}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <div className="flex items-center justify-between w-full text-xs text-slate-500">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{getTimeAgo(post.createdAt)}</span>
              </div>
              {post.category && (
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4" />
                  <span className="capitalize font-medium">{post.category}</span>
                </div>
              )}
              {post.shares && post.shares > 0 && (
                <div className="flex items-center space-x-2">
                  <Share2 className="w-4 h-4" />
                  <span className="font-medium">{formatNumber(post.shares)} shares</span>
                </div>
              )}
            </div>
            
            {post.engagement && (
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium text-green-600">{post.engagement}% engagement</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Engagement Stats Modal */}
      <AnimatePresence>
        {state.showEngagementStats && (
          <EngagementStatsModal
            post={post}
            likeCount={state.likeCount}
            commentCount={state.commentCount}
            saveCount={state.saveCount}
            onClose={() => setState(prev => ({ ...prev, showEngagementStats: false }))}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {state.showDeleteConfirm && (
          <DeleteConfirmationModal
            post={post}
            onDelete={onDelete}
            onClose={() => setState(prev => ({ ...prev, showDeleteConfirm: false }))}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Options Menu Component (Improved)
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
      className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 py-3 backdrop-blur-xl"
    >
      {isAuthor ? (
        <>
          <button
            onClick={() => { onEdit(); onClose(); }}
            className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-xl mx-2"
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
            className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-xl mx-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
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
        className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-xl mx-2"
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
        className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-xl mx-2"
      >
        <Copy className="w-4 h-4 text-slate-500" />
        <span>Copy Caption</span>
      </button>
    </motion.div>
  )
}

// Share Menu Component (Improved)
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
      className="absolute left-0 bottom-full mb-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 py-3 backdrop-blur-xl"
    >
      <button
        onClick={() => onShare('social')}
        className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-xl mx-2"
      >
        <Share2 className="w-4 h-4 text-green-500" />
        <span>Share via...</span>
      </button>
      <button
        onClick={() => onShare('link')}
        className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-xl mx-2"
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
      <div className="h-px bg-slate-200 dark:bg-slate-700 my-2" />
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
        className="flex items-center space-x-3 w-full px-5 py-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-xl mx-2"
      >
        <DownloadCloud className="w-4 h-4 text-blue-500" />
        <span>Download Media</span>
      </button>
    </motion.div>
  )
}

// Comments Section Component (Improved)
function CommentsSection({
  post,
  commentsArray,
  onComment,
  commentText,
  setCommentText,
  loading,
  currentUserId,
  isSignedIn
}: {
  post: Post
  commentsArray: Comment[]
  onComment: () => Promise<void>
  commentText: string
  setCommentText: (text: string) => void
  loading: boolean
  currentUserId?: string
  isSignedIn: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const commentDate = new Date(date)
    const diffInHours = (now.getTime() - commentDate.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    return commentDate.toLocaleDateString()
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden mt-4"
    >
      {/* Comments List */}
      <div className="space-y-4 max-h-64 overflow-y-auto pr-2 mb-4">
        {commentsArray.slice(0, 3).map((comment) => (
          <div key={comment._id} className="flex items-start space-x-3">
            <Link href={`/profile/${comment.user?.username}`}>
              <Avatar className="w-8 h-8 flex-shrink-0 border border-slate-200 dark:border-slate-700">
                <AvatarImage src={comment.user?.avatar} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                  {comment.user?.firstName?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
            
            <div className="flex-1 min-w-0">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/profile/${comment.user?.username}`}>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white hover:text-rose-600 transition-colors">
                      {comment.user?.username || 'user'}
                    </p>
                  </Link>
                  <span className="text-xs text-slate-500">
                    {getTimeAgo(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {comment.text}
                </p>
              </div>
              <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500 ml-1">
                <button className="hover:text-rose-500 transition-colors flex items-center">
                  <Heart className="w-3 h-3 mr-1" />
                  Like
                </button>
                <button className="hover:text-blue-500 transition-colors flex items-center">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Reply
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {commentsArray.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl py-2"
            onClick={() => router.push(`/posts/${post._id}#comments`)}
          >
            View all {commentsArray.length} comments
          </Button>
        )}
      </div>

      {/* Add Comment */}
      <div className="flex items-center space-x-3">
        <Input
          placeholder={isSignedIn ? "Add a comment..." : "Sign in to comment"}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => {
            if (isSignedIn && e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
              e.preventDefault()
              onComment()
            }
          }}
          className="rounded-2xl bg-slate-100 dark:bg-slate-700 border-0 focus:ring-2 focus:ring-rose-500/20"
          disabled={!isSignedIn || loading}
          onClick={() => !isSignedIn && router.push('/sign-in')}
        />
        
        {isSignedIn ? (
          <Button
            onClick={onComment}
            disabled={!commentText.trim() || loading}
            size="icon"
            className="rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        ) : (
          <Button
            onClick={() => router.push('/sign-in')}
            className="rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
          >
            Sign In
          </Button>
        )}
      </div>
    </motion.div>
  )
}

// Engagement Stats Modal Component (Improved)
function EngagementStatsModal({
  post,
  likeCount,
  commentCount,
  saveCount,
  onClose
}: {
  post: Post
  likeCount: number
  commentCount: number
  saveCount: number
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Post Analytics</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Detailed engagement metrics</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            ×
          </Button>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-5 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl">
              <Heart className="w-8 h-8 text-rose-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-rose-600">{formatNumber(likeCount)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Likes</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl">
              <MessageCircle className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-blue-600">{formatNumber(commentCount)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Comments</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl">
              <Bookmark className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-amber-600">{formatNumber(saveCount)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Saves</div>
            </div>
            <div className="text-center p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl">
              <Share2 className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-green-600">{formatNumber(post.shares || 0)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Shares</div>
            </div>
          </div>
          
          <div className="p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold text-slate-900 dark:text-white">Engagement Rate</span>
              <span className="font-bold text-xl text-green-600">{post.engagement || 0}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${post.engagement || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(post.views || 0)}</div>
              <div className="text-xs text-slate-500">Views</div>
            </div>
            <div className="text-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {post.media?.length || 1}
              </div>
              <div className="text-xs text-slate-500">Media Items</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Delete Confirmation Modal Component (Improved)
function DeleteConfirmationModal({
  post,
  onDelete,
  onClose
}: {
  post: Post
  onDelete?: (postId: string) => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
      >
        <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Trash2 className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">Delete Post?</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          This action cannot be undone. The post will be permanently deleted from our servers.
        </p>
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-2xl h-12 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await onDelete?.(post._id)
              onClose()
            }}
            className="flex-1 rounded-2xl h-12 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
          >
            Delete
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}