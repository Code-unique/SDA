'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
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
  Copy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FeaturedPost } from '@/types'

// Define proper types
interface User {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar?: string
  email: string
  followers?: string[] | { _id: string }[]
  isVerified?: boolean
  isPro?: boolean
  badges?: string[]
  createdAt: string
  updatedAt: string
}

interface LikeEntry {
  _id?: string
  id?: string
}

interface Media {
  _id?: string
  url: string
  type: 'image' | 'video' | 'string'
  thumbnail?: string
  alt?: string
  publicId?: string
}

interface Comment {
  _id: string
  user: User
  text: string
  likes: string[]
  createdAt: string
  isEdited?: boolean
}

interface Post {
  _id: string
  author: User
  media: Media[]
  caption: string
  likes: string[] | LikeEntry[]
  saves: string[]
  comments: Comment[]
  views?: number
  shares?: number
  engagement?: number
  createdAt: string
  updatedAt: string
  location?: string
  category?: string
  hashtags?: string[]
  mentions?: string[]
  isSponsored?: boolean
  isFeatured?: boolean
  isEdited?: boolean
  aiGenerated?: boolean
  collaboration?: boolean
  availableForSale?: boolean
  price?: number
  currency?: string
}

interface ApiResponse {
  liked?: boolean
  saved?: boolean
  following?: boolean
  success?: boolean
  data?: any
}

export interface PostCardProps {
  post?: Post | FeaturedPost
  onLike?: (postId: string) => Promise<ApiResponse | void>
  onSave?: (postId: string) => Promise<ApiResponse | void>
  onShare?: (postId: string) => Promise<void>
  onComment?: (postId: string, text: string) => Promise<ApiResponse | void>
  onFollow?: (userId: string) => Promise<ApiResponse | void>
  onReport?: (postId: string, reason: string) => void
  onEdit?: (postId: string) => void
  onDelete?: (postId: string) => void
  onPurchase?: (postId: string) => void
  onVote?: (postId: string, optionId: string) => void
  onMention?: (username: string) => void
  onHashtagClick?: (hashtag: string) => void
  currentUserId?: string
  showEngagement?: boolean
  compact?: boolean
  featured?: boolean
  viewMode?: 'grid' | 'list'
  className?: string
}
// Fixed API integration functions
const usePostActions = (postId: string, currentUserId?: string) => {
  const [loading, setLoading] = useState(false)

  const handleLike = async (): Promise<ApiResponse> => {
    if (!postId || loading) throw new Error('No post ID or already loading')

    setLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to like post')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error liking post:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (): Promise<ApiResponse> => {
    if (!postId || loading) throw new Error('No post ID or already loading')

    setLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save post')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error saving post:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleComment = async (commentText: string): Promise<ApiResponse> => {
    if (!postId || !commentText.trim() || loading) throw new Error('Invalid input or already loading')

    setLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: commentText }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add comment')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (userId: string): Promise<ApiResponse> => {
    if (!userId || loading) throw new Error('No user ID or already loading')

    setLoading(true)
    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to follow user')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error following user:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    handleLike,
    handleSave,
    handleComment,
    handleFollow,
  }
}

// Utility functions
const formatNumber = (num: number | undefined): string => {
  if (!num && num !== 0) return '0'
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

// Extract following status from API response
const extractFollowingStatus = (result: ApiResponse | void): boolean => {
  if (!result) return false

  // Handle different response formats
  if (result.following !== undefined) return result.following
  if (result.data?.following !== undefined) return result.data.following
  if (result.success && result.data) return true

  return false
}

// Check if user is following - simplified
const isUserFollowing = (author: User, currentUserId?: string): boolean => {
  if (!currentUserId || !author.followers) return false

  return author.followers.some(follower => {
    if (typeof follower === 'string') {
      return follower === currentUserId
    } else if (follower && typeof follower === 'object' && '_id' in follower) {
      return follower._id === currentUserId
    }
    return false
  })
}

// Check if user liked the post
const isPostLiked = (post: Post, currentUserId?: string): boolean => {
  if (!currentUserId || !post.likes) return false

  return post.likes.some(like => {
    if (typeof like === 'string') {
      return like === currentUserId
    } else if (like && typeof like === 'object') {
      return like._id === currentUserId || like.id === currentUserId
    }
    return false
  })
}

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
  onVote,
  onMention,
  onHashtagClick,
  currentUserId,
  showEngagement = true,
  compact = false,
  featured = false,
  viewMode = 'grid',
  className
}: PostCardProps) {
  // Safe post data with defaults
 const safePost: Post = post ? normalizePost(post) : {
  _id: 'default-id',
  author: {
    _id: 'default-author',
    username: 'user',
    firstName: 'User',
    lastName: 'Name',
    avatar: '',
    email: 'user@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  media: [],
  caption: '',
  likes: [],
  saves: [],
  comments: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

  // API actions
  const { loading: apiLoading, handleLike: apiLike, handleSave: apiSave, handleComment: apiComment, handleFollow: apiFollow } = usePostActions(safePost._id, currentUserId)

  // State management with safe defaults
  const [isLiked, setIsLiked] = useState(() => isPostLiked(safePost, currentUserId))
  const [isSaved, setIsSaved] = useState(safePost.saves?.includes(currentUserId || '') || false)
  const [isFollowing, setIsFollowing] = useState(() =>
    isUserFollowing(safePost.author, currentUserId)
  )
  const [likeCount, setLikeCount] = useState(safePost.likes?.length || 0)
  const [commentCount, setCommentCount] = useState(safePost.comments?.length || 0)
  const [saveCount, setSaveCount] = useState(safePost.saves?.length || 0)
  const [viewCount, setViewCount] = useState(safePost.views || 0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showEngagementStats, setShowEngagementStats] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [selectedPollOption, setSelectedPollOption] = useState<number | null>(null)
  const { toast } = useToast()
  const [showFullCaption, setShowFullCaption] = useState(false)
  const [copied, setCopied] = useState(false)
  const [actionLoading, setActionLoading] = useState({
    like: false,
    save: false,
    comment: false,
    follow: false
  })

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const shareRef = useRef<HTMLDivElement>(null)

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false)
      }
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShowShareMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fixed action handlers with proper type checking
  const handleLike = async () => {
    if (apiLoading || actionLoading.like || !safePost._id) return

    try {
      setActionLoading(prev => ({ ...prev, like: true }))
      const previousIsLiked = isLiked
      const previousLikeCount = likeCount

      // Optimistic update
      setIsLiked(!isLiked)
      setLikeCount(prev => !isLiked ? prev + 1 : prev - 1)

      const result = onLike ? await onLike(safePost._id) : await apiLike()

      // Update state based on API response with proper type checking
      if (result && typeof result === 'object' && 'liked' in result && typeof result.liked === 'boolean') {
        setIsLiked(result.liked)
        setLikeCount(prev => result.liked ? prev + 1 : prev - 1)
      }
    } catch (error) {
      // Revert on error
      setIsLiked(isLiked)
      setLikeCount(likeCount)
      console.error('Error liking post:', error)
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, like: false }))
    }
  }

  const handleSave = async () => {
    if (apiLoading || actionLoading.save || !safePost._id) return

    try {
      setActionLoading(prev => ({ ...prev, save: true }))
      const previousIsSaved = isSaved

      // Optimistic update
      setIsSaved(!isSaved)
      setSaveCount(prev => !isSaved ? prev + 1 : prev - 1)

      const result = onSave ? await onSave(safePost._id) : await apiSave()

      // Update state based on API response with proper type checking
      if (result && typeof result === 'object' && 'saved' in result && typeof result.saved === 'boolean') {
        setIsSaved(result.saved)
        setSaveCount(prev => result.saved ? prev + 1 : prev - 1)
      }
    } catch (error) {
      // Revert on error
      setIsSaved(isSaved)
      setSaveCount(saveCount)
      console.error('Error saving post:', error)
      toast({
        title: "Error",
        description: "Failed to save post",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, save: false }))
    }
  }

  const handleFollow = async () => {
    if (apiLoading || actionLoading.follow || !safePost.author._id) return

    try {
      setActionLoading(prev => ({ ...prev, follow: true }))
      const previousIsFollowing = isFollowing

      // Optimistic update
      setIsFollowing(!isFollowing)

      const result = onFollow ? await onFollow(safePost.author._id) : await apiFollow(safePost.author._id)

      // Extract following status from response
      const followingStatus = extractFollowingStatus(result)
      setIsFollowing(followingStatus)

      toast({
        title: followingStatus ? "Following" : "Unfollowed",
        description: followingStatus
          ? `You are now following ${safePost.author.firstName}`
          : `You unfollowed ${safePost.author.firstName}`,
        duration: 3000,
      })

    } catch (error) {
      // Revert optimistic update on error
      setIsFollowing(isFollowing)
      console.error('Error following user:', error)

      const errorMessage = error instanceof Error ? error.message : "Failed to update follow status"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setActionLoading(prev => ({ ...prev, follow: false }))
    }
  }

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || apiLoading || actionLoading.comment || !safePost._id) return

    try {
      setActionLoading(prev => ({ ...prev, comment: true }))

      const result = onComment ? await onComment(safePost._id, commentText) : await apiComment(commentText)

      if (result) {
        setCommentText('')
        setCommentCount(prev => prev + 1)
        setShowComments(true)
        toast({
          title: "Comment added",
          description: "Your comment has been posted",
          duration: 3000,
        })
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      })
    } finally {
      setActionLoading(prev => ({ ...prev, comment: false }))
    }
  }

  const handleShare = async (platform?: string) => {
    if (!safePost._id) return

    try {
      if (onShare) {
        await onShare(safePost._id)
      }

      setShowShareMenu(false)

      if (platform === 'copy') {
        await navigator.clipboard.writeText(`${window.location.origin}/posts/${safePost._id}`)
        setCopied(true)
        toast({
          title: "Link copied",
          description: "Post link copied to clipboard",
          duration: 3000,
        })
        setTimeout(() => setCopied(false), 2000)
        return
      }

      // Native share if available
      if (navigator.share && !platform) {
        await navigator.share({
          title: `Check out this design by ${safePost.author.firstName} ${safePost.author.lastName}`,
          text: safePost.caption,
          url: `${window.location.origin}/posts/${safePost._id}`,
        })
      }
    } catch (error) {
      console.error('Error sharing post:', error)
      toast({
        title: "Error",
        description: "Failed to share post",
        variant: "destructive",
      })
    }
  }

  // Return loading state if no post
  if (!post) {
    return (
      <Card className={cn(
        "relative overflow-hidden border-2 animate-pulse",
        "border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80",
        className
      )}>
        <div className="aspect-square bg-slate-200 dark:bg-slate-700" />
        <CardContent className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render different view modes
  if (compact) {
    return <CompactPostCard post={safePost} onLike={handleLike} />
  }

  if (viewMode === 'list') {
    return <ListPostCard post={safePost} onLike={handleLike} onSave={handleSave} />
  }

  // Default grid/detailed view
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
        safePost.isSponsored && "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
      )}>
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href={`/profile/${safePost.author.username}`}>
                <div className="relative">
                  <Avatar className="w-10 h-10 border-2 border-white dark:border-slate-800 shadow-lg hover:scale-105 transition-transform duration-300">
                    <AvatarImage src={safePost.author.avatar} alt={safePost.author.username} />
                    <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white">
                      {safePost.author.firstName?.[0]}{safePost.author.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {safePost.author.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-white dark:border-slate-800">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                  {safePost.author.isPro && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-1 border-2 border-white dark:border-slate-800">
                      <Crown className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Link href={`/profile/${safePost.author.username}`}>
                    <p className="font-semibold text-sm hover:text-rose-600 transition-colors truncate">
                      {safePost.author.firstName} {safePost.author.lastName}
                    </p>
                  </Link>
                  {safePost.author.badges?.slice(0, 2).map((badge, index) => (
                    <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                      {badge}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <span>@{safePost.author.username}</span>
                  <span>•</span>
                  <span>{getTimeAgo(safePost.createdAt)}</span>
                  {safePost.isEdited && <span>• Edited</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {safePost.isSponsored && (
                <Badge variant="default" className="bg-blue-500 text-white text-xs">
                  Sponsored
                </Badge>
              )}
              {safePost.isFeatured && (
                <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Featured
                </Badge>
              )}

              <div className="relative" ref={optionsRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowOptions(!showOptions)}
                  className="rounded-2xl w-8 h-8 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>

                <AnimatePresence>
                  {showOptions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-2 backdrop-blur-sm"
                    >
                      {currentUserId === safePost.author._id ? (
                        <>
                          <button
                            onClick={() => {
                              setShowEditModal(true)
                              setShowOptions(false)
                            }}
                            className="flex items-center space-x-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit Post</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(true)
                              setShowOptions(false)
                            }}
                            className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete Post</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleFollow}
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
                                isFollowing ? `Unfollow ${safePost.author.firstName}` :
                                  `Follow ${safePost.author.firstName}`}
                            </span>
                          </button>
                          <button
                            onClick={() => onReport?.(safePost._id, 'inappropriate')}
                            className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Flag className="w-4 h-4" />
                            <span>Report Post</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleShare('copy')}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {safePost.location && (
            <div className="flex items-center space-x-1 text-xs text-slate-500 mt-2">
              <MapPin className="w-3 h-3" />
              <span>{safePost.location}</span>
            </div>
          )}
        </CardHeader>

        {/* Media Content */}
        <div
          className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 overflow-hidden cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {safePost.media?.map((media, index) => (
            <div
              key={media.publicId || index}
              className={cn(
                "absolute inset-0 transition-all duration-500",
                index === currentMediaIndex ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              {media.type === 'video' ? (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    src={media.url}
                    poster={media.thumbnail}
                    muted={isMuted}
                    className="w-full h-full object-cover"
                    playsInline
                  />
                </div>
              ) : (
                <Link href={`/posts/${safePost._id}`}>
                  <div className="relative w-full h-full">
                    {!imageLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 animate-pulse" />
                    )}
                    <img
                      src={media.url}
                      alt={media.alt || safePost.caption}
                      className={cn(
                        "w-full h-full object-cover transition-all duration-700",
                        imageLoaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0'
                      )}
                      onLoad={() => setImageLoaded(true)}
                    />
                  </div>
                </Link>
              )}
            </div>
          ))}

          {/* Media Navigation */}
          {safePost.media && safePost.media.length > 1 && (
            <>
              <button
                onClick={() => setCurrentMediaIndex(prev => (prev - 1 + safePost.media.length) % safePost.media.length)}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
              >
                ←
              </button>
              <button
                onClick={() => setCurrentMediaIndex(prev => (prev + 1) % safePost.media.length)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70"
              >
                →
              </button>

              {/* Media Indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1.5">
                {safePost.media.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMediaIndex(index)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all duration-300 backdrop-blur-sm",
                      index === currentMediaIndex
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
            {/* AI Generated Badge */}
            {safePost.aiGenerated && (
              <Badge variant="secondary" className="bg-purple-600/80 text-white backdrop-blur-sm border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                <span className="text-xs font-medium">AI</span>
              </Badge>
            )}

            {/* Collaboration Badge */}
            {safePost.collaboration && (
              <Badge variant="secondary" className="bg-green-600/80 text-white backdrop-blur-sm border-0">
                <Users className="w-3 h-3 mr-1" />
                <span className="text-xs font-medium">Collab</span>
              </Badge>
            )}
          </div>

          {/* Purchase Overlay */}
          {safePost.availableForSale && safePost.price && (
            <div className="absolute top-3 left-3">
              <Button
                onClick={() => onPurchase?.(safePost._id)}
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 backdrop-blur-sm"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                ${safePost.price} {safePost.currency}
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
                  isLiked
                    ? "text-rose-500 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                    : "text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                )}
              >
                {actionLoading.like ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Heart className={cn(
                    "w-6 h-6 transition-all duration-300 group-hover/like:scale-110",
                    isLiked && "fill-current"
                  )} />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowComments(!showComments)}
                className="rounded-2xl w-12 h-12 text-slate-600 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 group/comment"
              >
                <MessageCircle className="w-6 h-6 group-hover/comment:scale-110 transition-transform duration-300" />
              </Button>

              <div className="relative" ref={shareRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="rounded-2xl w-12 h-12 text-slate-600 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300 group/share"
                >
                  <Share2 className="w-6 h-6 group-hover/share:scale-110 transition-transform duration-300" />
                </Button>

                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute left-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-2 backdrop-blur-sm"
                    >
                      <button
                        onClick={() => handleShare()}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share via...</span>
                      </button>
                      <button
                        onClick={() => handleShare('copy')}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                    </motion.div>
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
                isSaved
                  ? "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                  : "text-slate-600 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
              )}
            >
              {actionLoading.save ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Bookmark className={cn(
                  "w-6 h-6 transition-all duration-300 group-hover/save:scale-110",
                  isSaved && "fill-current"
                )} />
              )}
            </Button>
          </div>

          {/* Stats */}
          {showEngagement && (
            <div className="flex items-center space-x-6 text-sm text-slate-600 dark:text-slate-400 mb-3">
              <button
                onClick={() => setShowEngagementStats(true)}
                className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
              >
                <span className="font-bold">{formatNumber(likeCount)}</span> likes
              </button>
              <button
                onClick={() => setShowComments(true)}
                className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
              >
                <span className="font-bold">{formatNumber(commentCount)}</span> comments
              </button>
              <button className="hover:text-slate-900 dark:hover:text-white transition-colors font-medium">
                <span className="font-bold">{formatNumber(saveCount)}</span> saves
              </button>
            </div>
          )}

          {/* Caption */}
          <div className="mb-3">
            <div className="flex items-start space-x-2">
              <Link href={`/profile/${safePost.author.username}`}>
                <span className="font-bold text-slate-900 dark:text-white hover:text-rose-600 transition-colors cursor-pointer text-sm">
                  {safePost.author.username}
                </span>
              </Link>
              <div className="flex-1">
                <p className={cn(
                  "text-slate-700 dark:text-slate-300 text-sm",
                  !showFullCaption && "line-clamp-2"
                )}>
                  {safePost.caption}
                </p>
                {safePost.caption.length > 150 && (
                  <button
                    onClick={() => setShowFullCaption(!showFullCaption)}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium mt-1 transition-colors"
                  >
                    {showFullCaption ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Hashtags & Mentions */}
          {(safePost.hashtags && safePost.hashtags.length > 0 || safePost.mentions && safePost.mentions.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {safePost.hashtags?.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => onHashtagClick?.(tag)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors font-medium"
                >
                  #{tag}
                </button>
              ))}
              {safePost.mentions?.map((mention, index) => (
                <button
                  key={index}
                  onClick={() => onMention?.(mention)}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors font-medium"
                >
                  @{mention}
                </button>
              ))}
            </div>
          )}

          {/* Comments Section */}
          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {safePost.comments?.slice(0, 5).map((comment) => (
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
                          <button className="hover:text-rose-500 transition-colors flex items-center space-x-1">
                            <ThumbsUp className="w-3 h-3" />
                            <span>{comment.likes?.length || 0}</span>
                          </button>
                          <button className="hover:text-blue-500 transition-colors">
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                <div className="flex items-center space-x-2 mt-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={safePost.author.avatar} />
                    <AvatarFallback className="text-xs">
                      {safePost.author.firstName?.[0]}{safePost.author.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleCommentSubmit()
                        }
                      }}
                      className="rounded-2xl pr-12"
                    />
                    <Button
                      onClick={handleCommentSubmit}
                      disabled={!commentText.trim() || actionLoading.comment}
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 w-8 h-8 rounded-xl"
                    >
                      {actionLoading.comment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        {/* Footer */}
        <CardFooter className="pt-0 px-4 pb-4">
          <div className="flex items-center justify-between w-full text-xs text-slate-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{getTimeAgo(safePost.createdAt)}</span>
              </div>
              {safePost.category && (
                <div className="flex items-center space-x-1">
                  <Tag className="w-3 h-3" />
                  <span className="capitalize">{safePost.category}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {safePost.shares && safePost.shares > 0 && (
                <div className="flex items-center space-x-1">
                  <Share2 className="w-3 h-3" />
                  <span>{formatNumber(safePost.shares)}</span>
                </div>
              )}
            </div>
          </div>
        </CardFooter>
      </Card>

      {/* Engagement Stats Modal */}
      <AnimatePresence>
        {showEngagementStats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEngagementStats(false)}
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
                  onClick={() => setShowEngagementStats(false)}
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
                    <div className="text-2xl font-bold text-green-600">{formatNumber(safePost.shares || 0)}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">Shares</div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Engagement Rate</span>
                    <span className="font-bold text-lg text-green-600">{safePost.engagement || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${safePost.engagement || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
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
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-2xl"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await onDelete?.(safePost._id)
                    setShowDeleteConfirm(false)
                  }}
                  className="flex-1 rounded-2xl"
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Compact version for feeds
interface CompactPostCardProps {
  post: Post
  onLike?: (postId: string) => Promise<ApiResponse | void>
}
function normalizePost(post: Post | FeaturedPost): Post {
  return {
    ...post,
    media: (post.media || []).map(mediaItem => ({
      ...mediaItem,
      type: mediaItem.type === 'image' || mediaItem.type === 'video' 
        ? mediaItem.type 
        : 'image' // default fallback
    }))
  };
}

function CompactPostCard({ post, onLike }: CompactPostCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0)
  const [loading, setLoading] = useState(false)

  const handleLike = async () => {
    if (!onLike || loading) return

    try {
      setLoading(true)
      const newLikeState = !isLiked
      setIsLiked(newLikeState)
      setLikeCount(prev => newLikeState ? prev + 1 : prev - 1)

      const result = await onLike(post._id)

      if (result && typeof result === 'object' && 'liked' in result && typeof result.liked === 'boolean') {
        setIsLiked(result.liked)
        setLikeCount(prev => result.liked ? prev + 1 : prev - 1)
      }
    } catch (error) {
      setIsLiked(!isLiked)
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
      console.error('Error liking post:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="group rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 border-0">
      <Link href={`/posts/${post._id}`}>
        <div className="aspect-square bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
          <img
            src={post.media?.[0]?.url}
            alt={post.caption}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </Link>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleLike}
            disabled={loading}
            className={cn(
              "flex items-center space-x-1 transition-colors",
              isLiked ? "text-rose-500" : "text-slate-500 hover:text-rose-500"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
            )}
            <span className="text-xs font-medium">{likeCount}</span>
          </button>
          <span className="text-xs text-slate-500">
            {post.comments?.length || 0} comments
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// List view version
interface ListPostCardProps {
  post: Post
  onLike?: (postId: string) => Promise<ApiResponse | void>
  onSave?: (postId: string) => Promise<ApiResponse | void>
}

function ListPostCard({ post, onLike, onSave }: ListPostCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes?.length || 0)
  const [loading, setLoading] = useState({ like: false, save: false })

  const handleLike = async () => {
    if (!onLike || loading.like) return

    try {
      setLoading(prev => ({ ...prev, like: true }))
      const newLikeState = !isLiked
      setIsLiked(newLikeState)
      setLikeCount(prev => newLikeState ? prev + 1 : prev - 1)

      const result = await onLike(post._id)

      if (result && typeof result === 'object' && 'liked' in result && typeof result.liked === 'boolean') {
        setIsLiked(result.liked)
        setLikeCount(prev => result.liked ? prev + 1 : prev - 1)
      }
    } catch (error) {
      setIsLiked(!isLiked)
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1)
      console.error('Error liking post:', error)
    } finally {
      setLoading(prev => ({ ...prev, like: false }))
    }
  }

  const handleSave = async () => {
    if (!onSave || loading.save) return

    try {
      setLoading(prev => ({ ...prev, save: true }))
      const newSaveState = !isSaved
      setIsSaved(newSaveState)

      const result = await onSave(post._id)

      if (result && typeof result === 'object' && 'saved' in result && typeof result.saved === 'boolean') {
        setIsSaved(result.saved)
      }
    } catch (error) {
      setIsSaved(!isSaved)
      console.error('Error saving post:', error)
    } finally {
      setLoading(prev => ({ ...prev, save: false }))
    }
  }

  return (
    <Card className="flex flex-row group hover:shadow-lg transition-all duration-300 rounded-2xl border-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
      <Link href={`/posts/${post._id}`} className="flex-shrink-0">
        <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl overflow-hidden m-3">
          <img
            src={post.media?.[0]?.url}
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
              disabled={loading.like}
              className={cn(
                "text-slate-500 hover:text-rose-500 transition-colors",
                isLiked && "text-rose-500"
              )}
            >
              {loading.like ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              )}
            </button>
            <button
              onClick={handleSave}
              disabled={loading.save}
              className={cn(
                "text-slate-500 hover:text-yellow-500 transition-colors",
                isSaved && "text-yellow-500"
              )}
            >
              {loading.save ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{likeCount} likes</span>
          <span>{post.comments?.length || 0} comments</span>
        </div>
      </div>
    </Card>
  )
}