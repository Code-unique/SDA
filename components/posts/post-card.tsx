'use client'

import { useState, useRef, useEffect, useCallback, memo } from 'react'
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
  Eye,
  BarChart3,
  ZoomIn,
  Download,
  Music
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface User {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar?: string
  banner?: string
  bio: string
  location: string
  website: string
  role: 'user' | 'admin' | 'designer'
  interests: string[]
  skills: string[]
  isVerified: boolean
  followers: string[]
  following: string[]
  createdAt: string
  isPro?: boolean
  badges?: string[]
}

interface PostMedia {
  _id?: string
  type: 'image' | 'video'
  url: string
  thumbnail?: string
  alt?: string
  publicId?: string
}

interface Comment {
  _id: string
  user: User
  text: string
  likes: string[] | User[]
  createdAt: string
  isEdited?: boolean
}

interface Post {
  _id: string
  author: User
  media: PostMedia[]
  caption: string
  hashtags: string[]
  likes: string[] | User[]
  comments: Comment[]
  saves: string[] | User[]
  createdAt: string
  isSponsored?: boolean
  isFeatured?: boolean
  isEdited?: boolean
  location?: string
  category?: string
  shares?: number
  aiGenerated?: boolean
  collaboration?: boolean
  availableForSale?: boolean
  price?: number
  currency?: string
  music?: {
    title: string
    artist: string
  }
  engagement?: number
}

interface ApiResponse {
  success: boolean
  data?: any
  error?: string
}

interface PostCardProps {
  post: Post
  onLike?: (postId: string) => Promise<ApiResponse | void>
  onSave?: (postId: string) => Promise<ApiResponse | void>
  onShare?: (postId: string) => Promise<void>
  onComment?: (postId: string, text: string) => Promise<ApiResponse | void>
  onFollow?: (userId: string) => Promise<ApiResponse | void>
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
  viewMode?: 'grid' | 'list' | 'feed' | 'detailed'
  className?: string
}

// Utility functions
const formatNumber = (num: number | undefined): string => {
  if (!num && num !== 0) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const getTimeAgo = (date: string | undefined): string => {
  if (!date) return 'Recently'
  
  try {
    const now = new Date()
    const postDate = new Date(date)
    const diffInHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return postDate.toLocaleDateString()
  } catch {
    return 'Recently'
  }
}

// Main PostCard Component
export function PostCard({
  post,
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
  viewMode = 'detailed',
  className
}: PostCardProps) {
  const { user: currentUser, isSignedIn } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  // Consolidated state for better performance
  const [state, setState] = useState({
    isLiked: false,
    isSaved: false,
    isFollowing: false,
    likeCount: post.likes?.length || 0,
    commentCount: post.comments?.length || 0,
    saveCount: post.saves?.length || 0,
    currentMediaIndex: 0,
    isPlaying: false,
    isMuted: true,
    showComments: false,
    showOptions: false,
    showShareMenu: false,
    showEngagementStats: false,
    showEditModal: false,
    showDeleteConfirm: false,
    commentText: '',
    imageLoaded: false,
    videoProgress: 0,
    isHovered: false,
    showFullCaption: false,
    copied: false
  })

  const [actionLoading, setActionLoading] = useState({
    like: false,
    save: false,
    comment: false,
    follow: false
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const shareRef = useRef<HTMLDivElement>(null)

  const userId = currentUserId || currentUser?.id

  // Initialize state from post data
  useEffect(() => {
    if (userId) {
      const liked = post.likes?.some(like => 
        typeof like === 'string' ? like === userId : 
        (like as User)._id === userId
      )

      const saved = post.saves?.some(save =>
        typeof save === 'string' ? save === userId :
        (save as User)._id === userId
      )

      const following = post.author.followers?.some(follower =>
        typeof follower === 'string' ? follower === userId :
        (follower as User)._id === userId
      )

      setState(prev => ({
        ...prev,
        isLiked: !!liked,
        isSaved: !!saved,
        isFollowing: !!following
      }))
    }
  }, [post, userId])

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setState(prev => ({ ...prev, showOptions: false }))
      }
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setState(prev => ({ ...prev, showShareMenu: false }))
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Optimized action handlers with useCallback
  const handleLike = useCallback(async () => {
    if (actionLoading.like || !isSignedIn) {
      if (!isSignedIn) {
        toast({ title: "Please sign in to like posts", variant: "destructive" })
      }
      return
    }

    setActionLoading(prev => ({ ...prev, like: true }))
    const previousLiked = state.isLiked
    const previousLikeCount = state.likeCount

    // Optimistic update
    setState(prev => ({
      ...prev,
      isLiked: !prev.isLiked,
      likeCount: !prev.isLiked ? prev.likeCount + 1 : prev.likeCount - 1
    }))

    try {
      if (onLike) {
        await onLike(post._id)
      } else {
        const response = await fetch(`/api/posts/${post._id}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (!response.ok) throw new Error('Like failed')
        const data = await response.json()
        
        if (data.success) {
          setState(prev => ({
            ...prev,
            isLiked: data.data.liked,
            likeCount: data.data.likesCount
          }))
        }
      }
    } catch (error) {
      // Revert on error
      setState(prev => ({
        ...prev,
        isLiked: previousLiked,
        likeCount: previousLikeCount
      }))
      toast({ title: "Failed to like post", variant: "destructive" })
    } finally {
      setActionLoading(prev => ({ ...prev, like: false }))
    }
  }, [actionLoading.like, isSignedIn, state.isLiked, state.likeCount, post._id, onLike, toast])

  const handleSave = useCallback(async () => {
    if (actionLoading.save || !isSignedIn) {
      if (!isSignedIn) {
        toast({ title: "Please sign in to save posts", variant: "destructive" })
      }
      return
    }

    setActionLoading(prev => ({ ...prev, save: true }))
    const previousSaved = state.isSaved
    const previousSaveCount = state.saveCount

    // Optimistic update
    setState(prev => ({
      ...prev,
      isSaved: !prev.isSaved,
      saveCount: !prev.isSaved ? prev.saveCount + 1 : prev.saveCount - 1
    }))

    try {
      if (onSave) {
        await onSave(post._id)
      } else {
        const response = await fetch(`/api/posts/${post._id}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (!response.ok) throw new Error('Save failed')
        const data = await response.json()
        
        if (data.success) {
          setState(prev => ({
            ...prev,
            isSaved: data.data.saved
          }))
        }
      }
    } catch (error) {
      // Revert on error
      setState(prev => ({
        ...prev,
        isSaved: previousSaved,
        saveCount: previousSaveCount
      }))
      toast({ title: "Failed to save post", variant: "destructive" })
    } finally {
      setActionLoading(prev => ({ ...prev, save: false }))
    }
  }, [actionLoading.save, isSignedIn, state.isSaved, state.saveCount, post._id, onSave, toast])

  const handleFollow = useCallback(async () => {
    if (actionLoading.follow || !isSignedIn) {
      if (!isSignedIn) {
        toast({ title: "Please sign in to follow users", variant: "destructive" })
      }
      return
    }

    setActionLoading(prev => ({ ...prev, follow: true }))
    const previousFollowing = state.isFollowing

    // Optimistic update
    setState(prev => ({ ...prev, isFollowing: !prev.isFollowing }))

    try {
      if (onFollow) {
        await onFollow(post.author._id)
      } else {
        const response = await fetch(`/api/users/${post.author._id}/follow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (!response.ok) throw new Error('Follow failed')
        const data = await response.json()
        
        if (data.success) {
          setState(prev => ({ ...prev, isFollowing: data.data.following }))
          toast({
            title: data.data.following ? "Following" : "Unfollowed",
            description: data.data.following 
              ? `You are now following ${post.author.firstName}`
              : `You unfollowed ${post.author.firstName}`
          })
        }
      }
    } catch (error) {
      // Revert on error
      setState(prev => ({ ...prev, isFollowing: previousFollowing }))
      toast({ title: "Failed to follow user", variant: "destructive" })
    } finally {
      setActionLoading(prev => ({ ...prev, follow: false }))
    }
  }, [actionLoading.follow, isSignedIn, state.isFollowing, post.author._id, post.author.firstName, onFollow, toast])

  const handleCommentSubmit = useCallback(async () => {
    if (!state.commentText.trim() || actionLoading.comment || !isSignedIn) {
      if (!isSignedIn) {
        toast({ title: "Please sign in to comment", variant: "destructive" })
      }
      return
    }

    setActionLoading(prev => ({ ...prev, comment: true }))
    const text = state.commentText.trim()

    try {
      if (onComment) {
        await onComment(post._id, text)
        setState(prev => ({
          ...prev,
          commentText: '',
          commentCount: prev.commentCount + 1,
          showComments: true
        }))
      } else {
        const response = await fetch(`/api/posts/${post._id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        })
        
        if (!response.ok) throw new Error('Comment failed')
        const data = await response.json()
        
        if (data.success) {
          setState(prev => ({
            ...prev,
            commentText: '',
            commentCount: prev.commentCount + 1,
            showComments: true
          }))
          toast({ title: "Comment added successfully" })
        }
      }
    } catch (error) {
      toast({ title: "Failed to add comment", variant: "destructive" })
    } finally {
      setActionLoading(prev => ({ ...prev, comment: false }))
    }
  }, [state.commentText, actionLoading.comment, isSignedIn, post._id, onComment, toast])

  const handleShare = useCallback(async (method: 'link' | 'social' = 'link') => {
    setState(prev => ({ ...prev, showShareMenu: false }))
    
    try {
      if (method === 'link') {
        await navigator.clipboard.writeText(`${window.location.origin}/posts/${post._id}`)
        setState(prev => ({ ...prev, copied: true }))
        setTimeout(() => setState(prev => ({ ...prev, copied: false })), 2000)
        toast({ title: "Link copied to clipboard" })
      } else if (method === 'social' && navigator.share) {
        await navigator.share({
          title: `Check out this design by ${post.author.firstName} ${post.author.lastName}`,
          text: post.caption,
          url: `${window.location.origin}/posts/${post._id}`,
        })
        
        // Track share
        if (onShare) {
          await onShare(post._id)
        }
      }
    } catch (error) {
      toast({ title: "Failed to share", variant: "destructive" })
    }
  }, [post._id, post.author.firstName, post.author.lastName, post.caption, onShare, toast])

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (state.isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
    }
  }, [state.isPlaying])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !state.isMuted
      setState(prev => ({ ...prev, isMuted: !prev.isMuted }))
    }
  }, [state.isMuted])

  const handleVideoProgress = useCallback(() => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setState(prev => ({ ...prev, videoProgress: progress }))
    }
  }, [])

  const isCommentAuthor = useCallback((commentUserId: string) => {
    return commentUserId === userId
  }, [userId])

  const isCommentLiked = useCallback((comment: Comment) => {
    return comment.likes?.some(like =>
      typeof like === 'string' ? like === userId :
      (like as User)._id === userId
    ) || false
  }, [userId])

  const handleLikeComment = useCallback(async (commentId: string) => {
    if (!isSignedIn) {
      toast({ title: "Please sign in to like comments", variant: "destructive" })
      return
    }

    try {
      const response = await fetch(`/api/posts/${post._id}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast({ title: "Comment liked" })
        }
      }
    } catch (error) {
      toast({ title: "Failed to like comment", variant: "destructive" })
    }
  }, [post._id, isSignedIn, toast])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!isSignedIn) {
      toast({ title: "Please sign in to delete comments", variant: "destructive" })
      return
    }

    try {
      const response = await fetch(`/api/posts/${post._id}/comments/${commentId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setState(prev => ({ ...prev, commentCount: prev.commentCount - 1 }))
          toast({ title: "Comment deleted" })
        }
      }
    } catch (error) {
      toast({ title: "Failed to delete comment", variant: "destructive" })
    }
  }, [post._id, isSignedIn, toast])

  // TikTok-style vertical feed view
  if (viewMode === 'feed') {
    return (
      <div className={cn("relative w-full h-screen snap-start bg-black", className)}>
        {/* Video/Image Background */}
        <div className="absolute inset-0">
          {post.media[state.currentMediaIndex]?.type === 'video' ? (
            <video
              ref={videoRef}
              src={post.media[state.currentMediaIndex].url}
              className="w-full h-full object-cover"
              loop
              muted={state.isMuted}
              onClick={togglePlay}
              onTimeUpdate={handleVideoProgress}
              onEnded={() => setState(prev => ({ ...prev, isPlaying: false }))}
            />
          ) : (
            <img
              src={post.media[state.currentMediaIndex]?.url}
              alt={post.caption}
              className="w-full h-full object-cover"
              onLoad={() => setState(prev => ({ ...prev, imageLoaded: true }))}
            />
          )}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 text-white">
          {/* Top Bar */}
          <div className="flex justify-between items-start">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-white hover:bg-white/20 rounded-full backdrop-blur-sm"
            >
              ←
            </Button>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setState(prev => ({ ...prev, showShareMenu: true }))}
                className="text-white hover:bg-white/20 rounded-full backdrop-blur-sm"
              >
                <Share2 className="w-6 h-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setState(prev => ({ ...prev, showOptions: true }))}
                className="text-white hover:bg-white/20 rounded-full backdrop-blur-sm"
              >
                <MoreHorizontal className="w-6 h-6" />
              </Button>
            </div>
          </div>

          {/* Bottom Content */}
          <div className="flex justify-between items-end">
            {/* Left: Author & Caption */}
            <div className="flex-1 space-y-4 max-w-2xl">
              {/* Author */}
              <div className="flex items-center space-x-3">
                <Avatar className="w-12 h-12 border-2 border-white cursor-pointer" onClick={() => router.push(`/profile/${post.author.username}`)}>
                  <AvatarImage src={post.author.avatar} />
                  <AvatarFallback className="bg-gradient-to-r from-rose-500 to-pink-500">
                    {post.author.firstName?.[0]}{post.author.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Link href={`/profile/${post.author.username}`}>
                      <p className="font-semibold text-lg hover:underline cursor-pointer">
                        @{post.author.username}
                      </p>
                    </Link>
                    {post.author.isVerified && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {post.author.isPro && (
                      <div className="w-4 h-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center">
                        <Crown className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-white/80">{post.author.firstName} {post.author.lastName}</p>
                </div>
                <Button
                  onClick={handleFollow}
                  disabled={actionLoading.follow}
                  className={cn(
                    "rounded-full px-6 font-semibold transition-all",
                    state.isFollowing 
                      ? "bg-white text-black hover:bg-white/90" 
                      : "bg-rose-500 text-white hover:bg-rose-600"
                  )}
                >
                  {actionLoading.follow ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : state.isFollowing ? (
                    "Following"
                  ) : (
                    "Follow"
                  )}
                </Button>
              </div>

              {/* Caption */}
              <p className="text-lg leading-relaxed">
                {post.caption}
              </p>

              {/* Hashtags */}
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.hashtags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="text-white/80 hover:text-white cursor-pointer text-lg"
                      onClick={() => onHashtagClick?.(tag)}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Music */}
              {post.music && (
                <div className="flex items-center space-x-3 text-white/80">
                  <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
                    <Music className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-lg">{post.music.title} · {post.music.artist}</span>
                </div>
              )}
            </div>

            {/* Right: Engagement Actions */}
            <div className="flex flex-col items-center space-y-6 ml-6">
              {/* Profile Image with Follow */}
              <div className="relative group">
                <Avatar 
                  className="w-16 h-16 border-2 border-rose-500 cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => router.push(`/profile/${post.author.username}`)}
                >
                  <AvatarImage src={post.author.avatar} />
                  <AvatarFallback className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold">
                    {post.author.firstName?.[0]}{post.author.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-rose-600 transition-colors">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
                  </svg>
                </div>
              </div>

              {/* Like */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLike}
                  disabled={actionLoading.like}
                  className={cn(
                    "w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 transition-all backdrop-blur-sm",
                    state.isLiked && "text-rose-500"
                  )}
                >
                  {actionLoading.like ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <Heart className={cn("w-7 h-7 transition-all", state.isLiked && "fill-current scale-110")} />
                  )}
                </Button>
                <p className="text-sm font-semibold mt-2 text-white/90">{formatNumber(state.likeCount)}</p>
              </div>

              {/* Comment */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setState(prev => ({ ...prev, showComments: true }))}
                  className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all"
                >
                  <MessageCircle className="w-7 h-7" />
                </Button>
                <p className="text-sm font-semibold mt-2 text-white/90">{formatNumber(state.commentCount)}</p>
              </div>

              {/* Save */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSave}
                  disabled={actionLoading.save}
                  className={cn(
                    "w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 transition-all backdrop-blur-sm",
                    state.isSaved && "text-yellow-500"
                  )}
                >
                  {actionLoading.save ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    <Bookmark className={cn("w-7 h-7 transition-all", state.isSaved && "fill-current scale-110")} />
                  )}
                </Button>
                <p className="text-sm font-semibold mt-2 text-white/90">{formatNumber(state.saveCount)}</p>
              </div>

              {/* Share */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleShare('social')}
                  className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all"
                >
                  <Share2 className="w-7 h-7" />
                </Button>
                <p className="text-sm font-semibold mt-2 text-white/90">{formatNumber(post.shares || 0)}</p>
              </div>

              {/* Music Visualizer */}
              {post.music && (
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 3, 2, 1].map((height, i) => (
                      <div
                        key={i}
                        className="w-1 bg-rose-500 rounded-full animate-pulse"
                        style={{ 
                          height: `${height * 4}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Controls */}
        {post.media[state.currentMediaIndex]?.type === 'video' && (
          <div className="absolute bottom-24 left-6 flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:bg-white/20 rounded-full w-12 h-12 backdrop-blur-sm"
            >
              {state.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="text-white hover:bg-white/20 rounded-full w-10 h-10 backdrop-blur-sm"
            >
              {state.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
          </div>
        )}

        {/* Media Navigation for multiple media */}
        {post.media.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {post.media.map((_, index) => (
              <button
                key={index}
                onClick={() => setState(prev => ({ ...prev, currentMediaIndex: index }))}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300 backdrop-blur-sm",
                  index === state.currentMediaIndex 
                    ? "bg-white w-6" 
                    : "bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        )}

        {/* Comments Sheet */}
        <AnimatePresence>
          {state.showComments && (
            <CommentsSheet
              post={post}
              onClose={() => setState(prev => ({ ...prev, showComments: false }))}
              onComment={handleCommentSubmit}
              onLikeComment={handleLikeComment}
              onDeleteComment={handleDeleteComment}
              commentText={state.commentText}
              setCommentText={(text) => setState(prev => ({ ...prev, commentText: text }))}
              loading={actionLoading.comment}
              isCommentAuthor={isCommentAuthor}
              isCommentLiked={isCommentLiked}
              currentUserId={userId}
            />
          )}
        </AnimatePresence>

        {/* Options Menu */}
        <AnimatePresence>
          {state.showOptions && (
            <OptionsMenu
              post={post}
              currentUserId={userId}
              isFollowing={state.isFollowing}
              onFollow={handleFollow}
              onEdit={() => setState(prev => ({ ...prev, showEditModal: true }))}
              onDelete={() => setState(prev => ({ ...prev, showDeleteConfirm: true }))}
              onReport={onReport}
              onClose={() => setState(prev => ({ ...prev, showOptions: false }))}
              actionLoading={actionLoading}
            />
          )}
        </AnimatePresence>

        {/* Share Menu */}
        <AnimatePresence>
          {state.showShareMenu && (
            <ShareMenu
              onShare={handleShare}
              onClose={() => setState(prev => ({ ...prev, showShareMenu: false }))}
              copied={state.copied}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Default detailed view
  if (viewMode === 'detailed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3 }}
        className={cn("group", className)}
      >
        <Card className={cn(
          "relative overflow-hidden border-2 transition-all duration-500 backdrop-blur-sm",
          featured
            ? "border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 shadow-2xl"
            : "border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 hover:shadow-2xl hover:border-slate-300 dark:hover:border-slate-600",
          post.isSponsored && "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
        )}>
          {/* Header */}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link href={`/profile/${post.author.username}`}>
                  <div className="relative">
                    <Avatar className="w-10 h-10 border-2 border-white dark:border-slate-800 shadow-lg hover:scale-105 transition-transform duration-300">
                      <AvatarImage src={post.author.avatar} alt={post.author.username} />
                      <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                        {post.author.firstName?.[0]}{post.author.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {post.author.isVerified && (
                      <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-white dark:border-slate-800">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {post.author.isPro && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-1 border-2 border-white dark:border-slate-800">
                        <Crown className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <Link href={`/profile/${post.author.username}`}>
                      <p className="font-semibold text-sm hover:text-rose-600 transition-colors truncate">
                        {post.author.firstName} {post.author.lastName}
                      </p>
                    </Link>
                    {post.author.badges?.slice(0, 2).map((badge, index) => (
                      <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <span>@{post.author.username}</span>
                    <span>•</span>
                    <span>{getTimeAgo(post.createdAt)}</span>
                    {post.isEdited && <span>• Edited</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {post.isSponsored && (
                  <Badge variant="default" className="bg-blue-500 text-white text-xs">
                    Sponsored
                  </Badge>
                )}
                {post.isFeatured && (
                  <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                    <Star className="w-3 h-3 mr-1 fill-current" />
                    Featured
                  </Badge>
                )}

                <div className="relative" ref={optionsRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setState(prev => ({ ...prev, showOptions: !prev.showOptions }))}
                    className="rounded-2xl w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>

                  <AnimatePresence>
                    {state.showOptions && (
                      <OptionsMenu
                        post={post}
                        currentUserId={userId}
                        isFollowing={state.isFollowing}
                        onFollow={handleFollow}
                        onEdit={() => setState(prev => ({ ...prev, showEditModal: true }))}
                        onDelete={() => setState(prev => ({ ...prev, showDeleteConfirm: true }))}
                        onReport={onReport}
                        onClose={() => setState(prev => ({ ...prev, showOptions: false }))}
                        actionLoading={actionLoading}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {post.location && (
              <div className="flex items-center space-x-1 text-xs text-slate-500 mt-2">
                <MapPin className="w-3 h-3" />
                <span>{post.location}</span>
              </div>
            )}
          </CardHeader>

          {/* Media Content */}
          <div
            className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 overflow-hidden cursor-pointer"
            onMouseEnter={() => setState(prev => ({ ...prev, isHovered: true }))}
            onMouseLeave={() => setState(prev => ({ ...prev, isHovered: false }))}
          >
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
                      poster={media.thumbnail}
                      muted={state.isMuted}
                      className="w-full h-full object-cover"
                      playsInline
                      onTimeUpdate={handleVideoProgress}
                    />
                  </div>
                ) : (
                  <Link href={`/posts/${post._id}`}>
                    <div className="relative w-full h-full">
                      {!state.imageLoaded && (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 animate-pulse" />
                      )}
                      <img
                        src={media.url}
                        alt={media.alt || post.caption}
                        className={cn(
                          "w-full h-full object-cover transition-all duration-700",
                          state.imageLoaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0'
                        )}
                        onLoad={() => setState(prev => ({ ...prev, imageLoaded: true }))}
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
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    currentMediaIndex: (prev.currentMediaIndex - 1 + post.media.length) % post.media.length 
                  }))}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
                >
                  ←
                </button>
                <button
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    currentMediaIndex: (prev.currentMediaIndex + 1) % post.media.length 
                  }))}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
                >
                  →
                </button>

                {/* Media Indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1.5">
                  {post.media.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setState(prev => ({ ...prev, currentMediaIndex: index }))}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300 backdrop-blur-sm",
                        index === state.currentMediaIndex
                          ? "bg-white w-6 shadow-lg"
                          : "bg-white/50 hover:bg-white/80"
                      )}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Top Right Badges */}
            <div className="absolute top-3 right-3 flex flex-col space-y-2">
              {post.aiGenerated && (
                <Badge variant="secondary" className="bg-purple-600/80 text-white backdrop-blur-sm border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  <span className="text-xs font-medium">AI</span>
                </Badge>
              )}
              {post.collaboration && (
                <Badge variant="secondary" className="bg-green-600/80 text-white backdrop-blur-sm border-0">
                  <Users className="w-3 h-3 mr-1" />
                  <span className="text-xs font-medium">Collab</span>
                </Badge>
              )}
            </div>

            {/* Purchase Overlay */}
            {post.availableForSale && post.price && (
              <div className="absolute top-3 left-3">
                <Button
                  onClick={() => onPurchase?.(post._id)}
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  ${post.price} {post.currency}
                </Button>
              </div>
            )}
          </div>

          {/* Actions & Stats */}
          <CardContent className="p-4">
            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLike}
                  disabled={actionLoading.like}
                  className={cn(
                    "rounded-2xl w-12 h-12 transition-all duration-300 group/like",
                    state.isLiked
                      ? "text-rose-500 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                      : "text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                  )}
                >
                  {actionLoading.like ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Heart className={cn(
                      "w-6 h-6 transition-all duration-300 group-hover/like:scale-110",
                      state.isLiked && "fill-current"
                    )} />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setState(prev => ({ ...prev, showComments: !prev.showComments }))}
                  className="rounded-2xl w-12 h-12 text-slate-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 group/comment"
                >
                  <MessageCircle className="w-6 h-6 group-hover/comment:scale-110 transition-transform duration-300" />
                </Button>

                <div className="relative" ref={shareRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setState(prev => ({ ...prev, showShareMenu: !prev.showShareMenu }))}
                    className="rounded-2xl w-12 h-12 text-slate-600 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300 group/share"
                  >
                    <Share2 className="w-6 h-6 group-hover/share:scale-110 transition-transform duration-300" />
                  </Button>

                  <AnimatePresence>
                    {state.showShareMenu && (
                      <ShareMenu
                        onShare={handleShare}
                        onClose={() => setState(prev => ({ ...prev, showShareMenu: false }))}
                        copied={state.copied}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                disabled={actionLoading.save}
                className={cn(
                  "rounded-2xl w-12 h-12 transition-all duration-300 group/save",
                  state.isSaved
                    ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                    : "text-slate-600 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                )}
              >
                {actionLoading.save ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Bookmark className={cn(
                    "w-6 h-6 transition-all duration-300 group-hover/save:scale-110",
                    state.isSaved && "fill-current"
                  )} />
                )}
              </Button>
            </div>

            {/* Stats */}
            {showEngagement && (
              <div className="flex items-center space-x-6 text-sm text-slate-600 dark:text-slate-400 mb-3">
                <button
                  onClick={() => setState(prev => ({ ...prev, showEngagementStats: true }))}
                  className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
                >
                  <span className="font-bold">{formatNumber(state.likeCount)}</span> likes
                </button>
                <button
                  onClick={() => setState(prev => ({ ...prev, showComments: true }))}
                  className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
                >
                  <span className="font-bold">{formatNumber(state.commentCount)}</span> comments
                </button>
                <button className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium">
                  <span className="font-bold">{formatNumber(state.saveCount)}</span> saves
                </button>
              </div>
            )}

            {/* Caption */}
            <div className="mb-3">
              <div className="flex items-start space-x-2">
                <Link href={`/profile/${post.author.username}`}>
                  <span className="font-bold text-slate-900 dark:text-white hover:text-rose-600 transition-colors cursor-pointer text-sm">
                    {post.author.username}
                  </span>
                </Link>
                <div className="flex-1">
                  <p className={cn(
                    "text-slate-700 dark:text-slate-300 text-sm",
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

            {/* Hashtags & Mentions */}
            {(post.hashtags && post.hashtags.length > 0) && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {post.hashtags.map((tag, index) => (
                  <button
                    key={index}
                    onClick={() => onHashtagClick?.(tag)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
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
                  onComment={handleCommentSubmit}
                  onLikeComment={handleLikeComment}
                  onDeleteComment={handleDeleteComment}
                  commentText={state.commentText}
                  setCommentText={(text) => setState(prev => ({ ...prev, commentText: text }))}
                  loading={actionLoading.comment}
                  isCommentAuthor={isCommentAuthor}
                  isCommentLiked={isCommentLiked}
                  currentUserId={userId}
                />
              )}
            </AnimatePresence>
          </CardContent>

          {/* Footer */}
          <CardFooter className="pt-0 px-4 pb-4">
            <div className="flex items-center justify-between w-full text-xs text-slate-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{getTimeAgo(post.createdAt)}</span>
                </div>
                {post.category && (
                  <div className="flex items-center space-x-1">
                    <Tag className="w-3 h-3" />
                    <span className="capitalize">{post.category}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {post.shares && post.shares > 0 && (
                  <div className="flex items-center space-x-1">
                    <Share2 className="w-3 h-3" />
                    <span>{formatNumber(post.shares)}</span>
                  </div>
                )}
              </div>
            </div>
          </CardFooter>
        </Card>

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

  // Grid view for explore
  if (viewMode === 'grid') {
    return (
      <Card className={cn("group relative overflow-hidden rounded-2xl cursor-pointer", className)}>
        <CardContent className="p-0">
          <div 
            className="relative aspect-square bg-slate-100 overflow-hidden"
            onMouseEnter={() => setState(prev => ({ ...prev, isHovered: true }))}
            onMouseLeave={() => setState(prev => ({ ...prev, isHovered: false }))}
          >
            <img
              src={post.media[0]?.url}
              alt={post.caption}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            
            {/* Engagement Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
            
            {/* Quick Stats */}
            <div className="absolute bottom-3 left-3 flex items-center space-x-3 text-white text-sm">
              <div className="flex items-center space-x-1 bg-black/50 rounded-full px-2 py-1 backdrop-blur-sm">
                <Heart className="w-3 h-3" />
                <span>{formatNumber(state.likeCount)}</span>
              </div>
              <div className="flex items-center space-x-1 bg-black/50 rounded-full px-2 py-1 backdrop-blur-sm">
                <MessageCircle className="w-3 h-3" />
                <span>{formatNumber(state.commentCount)}</span>
              </div>
            </div>

            {/* Video Badge */}
            {post.media[0]?.type === 'video' && (
              <div className="absolute top-3 right-3 bg-black/50 rounded-full p-1.5 backdrop-blur-sm">
                <Play className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Author & Caption (on hover for grid) */}
          <AnimatePresence>
            {state.isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-4 flex flex-col justify-end"
              >
                <div className="text-white">
                  <div className="flex items-center space-x-2 mb-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={post.author.avatar} />
                      <AvatarFallback className="text-xs">
                        {post.author.firstName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-semibold">@{post.author.username}</span>
                  </div>
                  <p className="text-sm line-clamp-2">{post.caption}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    )
  }

  // List view
  return (
    <Card className="flex flex-row group hover:shadow-lg transition-all duration-300 rounded-2xl border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
      <Link href={`/posts/${post._id}`} className="flex-shrink-0">
        <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl overflow-hidden m-3">
          <img
            src={post.media[0]?.url}
            alt={post.caption}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>
      <div className="flex-1 p-3 pr-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <Link href={`/profile/${post.author.username}`}>
              <p className="font-semibold text-sm hover:text-rose-600 transition-colors">
                {post.author.firstName} {post.author.lastName}
              </p>
            </Link>
            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
              {post.caption}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLike}
              disabled={actionLoading.like}
              className={cn(
                "text-slate-500 hover:text-rose-500 transition-colors",
                state.isLiked && "text-rose-500"
              )}
            >
              {actionLoading.like ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Heart className={cn("w-4 h-4", state.isLiked && "fill-current")} />
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={actionLoading.save}
              className={cn(
                "text-slate-500 hover:text-yellow-500 transition-colors",
                state.isSaved && "text-yellow-500"
              )}
            >
              {actionLoading.save ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bookmark className={cn("w-4 h-4", state.isSaved && "fill-current")} />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{state.likeCount} likes</span>
          <span>{state.commentCount} comments</span>
        </div>
      </div>
    </Card>
  )
}

// Sub-components
function CommentsSheet({ 
  post, 
  onClose, 
  onComment, 
  onLikeComment,
  onDeleteComment,
  commentText, 
  setCommentText, 
  loading,
  isCommentAuthor,
  isCommentLiked,
  currentUserId
}: {
  post: Post
  onClose: () => void
  onComment: () => void
  onLikeComment: (commentId: string) => void
  onDeleteComment: (commentId: string) => void
  commentText: string
  setCommentText: (text: string) => void
  loading: boolean
  isCommentAuthor: (userId: string) => boolean
  isCommentLiked: (comment: Comment) => boolean
  currentUserId?: string
}) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed bottom-0 left-0 right-0 h-3/4 bg-white dark:bg-slate-900 rounded-t-3xl z-50 shadow-2xl"
    >
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Comments ({post.comments?.length || 0})
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {post.comments?.map((comment) => (
            <div key={comment._id} className="flex space-x-3 group">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={comment.user.avatar} />
                <AvatarFallback>
                  {comment.user.firstName?.[0]}{comment.user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    @{comment.user.username}
                  </span>
                  <span className="text-xs text-slate-500">
                    {getTimeAgo(comment.createdAt)}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm mb-2">
                  {comment.text}
                </p>
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <button 
                    onClick={() => onLikeComment(comment._id)}
                    className={cn(
                      "flex items-center space-x-1 transition-colors",
                      isCommentLiked(comment) && "text-rose-500"
                    )}
                  >
                    <ThumbsUp className={cn("w-3 h-3", isCommentLiked(comment) && "fill-current")} />
                    <span>{comment.likes?.length || 0}</span>
                  </button>
                  <button className="hover:text-blue-500 transition-colors">
                    Reply
                  </button>
                  {isCommentAuthor(comment.user._id) && (
                    <button 
                      onClick={() => onDeleteComment(comment._id)}
                      className="text-red-500 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Comment */}
        <div className="flex space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={currentUserId ? '/placeholder-avatar.png' : ''} />
            <AvatarFallback>
              {currentUserId ? 'CU' : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Input
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  onComment()
                }
              }}
              className="pr-12"
            />
            <Button 
              onClick={onComment}
              disabled={!commentText.trim() || loading}
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-xl"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function CommentsSection({
  post,
  onComment,
  onLikeComment,
  onDeleteComment,
  commentText,
  setCommentText,
  loading,
  isCommentAuthor,
  isCommentLiked,
  currentUserId
}: {
  post: Post
  onComment: () => void
  onLikeComment: (commentId: string) => void
  onDeleteComment: (commentId: string) => void
  commentText: string
  setCommentText: (text: string) => void
  loading: boolean
  isCommentAuthor: (userId: string) => boolean
  isCommentLiked: (comment: Comment) => boolean
  currentUserId?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
        {post.comments?.slice(0, 5).map((comment) => (
          <div key={comment._id} className="flex items-start space-x-3 group/comment">
            <Avatar className="w-6 h-6 flex-shrink-0">
              <AvatarImage src={comment.user.avatar} />
              <AvatarFallback className="text-xs">
                {comment.user.firstName?.[0]}{comment.user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl px-3 py-2 group-hover/comment:bg-slate-200 dark:group-hover/comment:bg-slate-600 transition-colors">
                <div className="flex items-center space-x-2 mb-1">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    {comment.user.username}
                  </p>
                  {comment.isEdited && (
                    <span className="text-xs text-slate-500">(edited)</span>
                  )}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{comment.text}</p>
              </div>
              <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500">
                <span>{getTimeAgo(comment.createdAt)}</span>
                <button 
                  onClick={() => onLikeComment(comment._id)}
                  className="hover:text-rose-500 transition-colors flex items-center space-x-1"
                >
                  <ThumbsUp className={cn("w-3 h-3", isCommentLiked(comment) && "fill-current")} />
                  <span>{comment.likes?.length || 0}</span>
                </button>
                <button className="hover:text-blue-500 transition-colors">
                  Reply
                </button>
                {isCommentAuthor(comment.user._id) && (
                  <button 
                    onClick={() => onDeleteComment(comment._id)}
                    className="text-red-500 hover:text-red-600 transition-colors opacity-0 group-hover/comment:opacity-100"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Comment */}
      <div className="flex items-center space-x-2 mt-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={currentUserId ? '/placeholder-avatar.png' : ''} />
          <AvatarFallback className="text-xs">
            {currentUserId ? 'CU' : '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 relative">
          <Input
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onComment()
              }
            }}
            className="rounded-2xl pr-12"
          />
          <Button
            onClick={onComment}
            disabled={!commentText.trim() || loading}
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-xl"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function OptionsMenu({
  post,
  currentUserId,
  isFollowing,
  onFollow,
  onEdit,
  onDelete,
  onReport,
  onClose,
  actionLoading
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
}) {
  const isAuthor = currentUserId === post.author._id

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-2 backdrop-blur-sm"
    >
      {isAuthor ? (
        <>
          <button
            onClick={() => { onEdit(); onClose(); }}
            className="flex items-center space-x-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Post</span>
          </button>
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Post</span>
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => { onFollow(); onClose(); }}
            disabled={actionLoading.follow}
            className="flex items-center space-x-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionLoading.follow ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFollowing ? (
              <UserCheck className="w-4 h-4 text-green-600" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {actionLoading.follow ? 'Processing...' :
                isFollowing ? `Unfollow ${post.author.firstName}` :
                  `Follow ${post.author.firstName}`}
            </span>
          </button>
          <button
            onClick={() => { onReport?.(post._id, 'inappropriate'); onClose(); }}
            className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Flag className="w-4 h-4" />
            <span>Report Post</span>
          </button>
        </>
      )}
      <button
        onClick={onClose}
        className="flex items-center space-x-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Copy className="w-4 h-4" />
        <span>Copy Link</span>
      </button>
    </motion.div>
  )
}

function ShareMenu({
  onShare,
  onClose,
  copied
}: {
  onShare: (method: 'link' | 'social') => void
  onClose: () => void
  copied: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="absolute left-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-2 backdrop-blur-sm"
    >
      <button
        onClick={() => onShare('social')}
        className="flex items-center space-x-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        <span>Share via...</span>
      </button>
      <button
        onClick={() => onShare('link')}
        className="flex items-center space-x-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        <span>{copied ? 'Copied!' : 'Copy Link'}</span>
      </button>
    </motion.div>
  )
}

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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Post Analytics</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-2xl"
          >
            ×
          </Button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl">
              <Heart className="w-6 h-6 text-rose-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-rose-600">{formatNumber(likeCount)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Likes</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <MessageCircle className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{formatNumber(commentCount)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Comments</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
              <Bookmark className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-600">{formatNumber(saveCount)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Saves</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
              <Share2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{formatNumber(post.shares || 0)}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Shares</div>
            </div>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Engagement Rate</span>
              <span className="font-bold text-lg text-green-600">{post.engagement || 0}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${post.engagement || 0}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

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
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full text-center"
      >
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Delete Post?</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This action cannot be undone. The post will be permanently deleted.
        </p>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-2xl"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await onDelete?.(post._id)
              onClose()
            }}
            className="flex-1 rounded-2xl"
          >
            Delete
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}