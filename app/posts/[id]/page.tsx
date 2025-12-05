'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Heart, 
  MessageCircle,
  Share2, 
  Bookmark, 
  Calendar,
  Send,
  ArrowLeft,
  Eye,
  Sparkles,
  Flag,
  Link as LinkIcon,
  MapPin,
  Crown,
  Verified,
  Zap,
  TrendingUp,
  BarChart3,
  User,
  ExternalLink,
  Rocket,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ZoomIn,
  Download,
  MoreHorizontal,
  UserPlus,
  UserCheck,
  ThumbsUp,
  Clock,
  Tag,
  ShoppingBag,
  Award,
  Star,
  Users,
  Camera,
  Video,
  Image as ImageIcon,
  Check,
  Trash2,
  Edit
} from 'lucide-react'
import { Post, Comment, ApiResponse } from '@/types/post'
import { cn } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'

// Define status interface
interface BatchStatuses {
  likeStatuses: Record<string, boolean>
  saveStatuses: Record<string, { saved: boolean; savedAt?: string }>
  followStatuses: Record<string, boolean>
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string
  
  const { user: currentUser, isLoaded: userLoaded, isSignedIn } = useUser()
  const { toast } = useToast()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [isLiking, setIsLiking] = useState(false)
  const [isCommenting, setIsCommenting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [optimisticFollowers, setOptimisticFollowers] = useState<number>(0)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [copied, setCopied] = useState(false)
  const [statuses, setStatuses] = useState<BatchStatuses>({
    likeStatuses: {},
    saveStatuses: {},
    followStatuses: {}
  })

  const headerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const shareRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.95])
  const headerBlur = useTransform(scrollY, [0, 100], [0, 8])

  // Get current user ID from Clerk
  const currentUserId = currentUser?.id || ''

  // Debug state
  useEffect(() => {
    console.log('Current State:', {
      postId,
      currentUserId,
      userLoaded,
      isSignedIn,
      post: post ? {
        id: post._id,
        likes: post.likes,
        author: post.author?._id,
        commentsCount: post.comments?.length,
      } : null,
      isFollowing,
      optimisticFollowers,
      isLiking,
      isCommenting,
      isSaving,
      statuses
    })
  }, [post, currentUserId, isFollowing, optimisticFollowers, isLiking, isCommenting, isSaving, userLoaded, isSignedIn, statuses])

  // Fetch statuses for the post
  const fetchStatuses = useCallback(async () => {
    if (!postId || !isSignedIn) return

    try {
      console.log('Fetching statuses for:', { postId, userIds: [post?.author?._id] })
      const response = await fetch('/api/batch-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postIds: [postId],
          userIds: post?.author?._id ? [post.author._id] : []
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Statuses fetched:', data)
        if (data.success && data.data) {
          setStatuses(data.data)
          
          // Update saved status
          if (data.data.saveStatuses[postId]) {
            setIsSaved(data.data.saveStatuses[postId].saved)
          }
          
          // Update follow status
          if (post?.author?._id && data.data.followStatuses[post.author._id]) {
            setIsFollowing(data.data.followStatuses[post.author._id])
          }
        }
      } else {
        console.error('Failed to fetch statuses:', response.status)
      }
    } catch (error) {
      console.error('Error fetching statuses:', error)
    }
  }, [postId, isSignedIn, post?.author?._id])

  // Fetch post data
  const fetchPost = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching post:', postId)
      const response = await fetch(`/api/posts/${postId}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Post data received:', data)
        if (data.success && data.data) {
          const postData = data.data
          setPost(postData)
          
          // Set optimistic follower count
          const followerCount = Array.isArray(postData.author?.followers) 
            ? postData.author.followers.length 
            : 0
          setOptimisticFollowers(followerCount)
          
          // Fetch statuses after post is loaded
          if (isSignedIn) {
            await fetchStatuses()
          }

          console.log('Post loaded successfully:', {
            postId: postData._id,
            likes: postData.likes?.length || 0,
            comments: postData.comments?.length || 0,
            author: postData.author?._id
          })
        } else {
          setError(data.error || 'Failed to load post')
        }
      } else {
        const errorText = await response.text()
        console.error('Failed to load post:', response.status, errorText)
        setError('Failed to load post')
      }
    } catch (error) {
      console.error('Error fetching post:', error)
      setError('Failed to load post')
    } finally {
      setLoading(false)
    }
  }, [postId, fetchStatuses, isSignedIn])

  useEffect(() => {
    if (postId && userLoaded) {
      fetchPost()
    }
  }, [postId, fetchPost, userLoaded])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false)
      }
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShowShareMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // FIXED: Like functionality with proper API integration
  const handleLike = async () => {
    if (!post || isLiking) {
      console.log("Like prevented: no post or already liking")
      return
    }

    if (!isSignedIn) {
      alert("Please log in to like posts")
      return
    }

    console.log("Starting like action:", { postId, currentUserId })

    // Normalize "likes" shape:
    type LikeEntry = string | { _id?: string; id?: string }

    const likes: LikeEntry[] = post.likes ?? []
    const wasLiked = statuses.likeStatuses[postId] || false

    console.log("Previous state:", { wasLiked })

    // Optimistic update - update both local state and statuses
    setPost(prev => {
      if (!prev) return prev

      // Normalize all likes to strings for consistent handling
      const normalizeLike = (like: string | LikeEntry): string => {
        if (typeof like === 'string') return like
        return like._id || like.id || ''
      }

      const currentLikeIds = (prev.likes ?? []).map(normalizeLike)
      let newLikeIds: string[]

      if (wasLiked) {
        // Remove like
        newLikeIds = currentLikeIds.filter(likeId => likeId !== currentUserId)
      } else {
        // Add like
        newLikeIds = [...currentLikeIds, currentUserId]
      }

      return {
        ...prev,
        likes: newLikeIds, // Store as strings for consistency
      }
    })

    // Update statuses optimistically
    setStatuses(prev => ({
      ...prev,
      likeStatuses: {
        ...prev.likeStatuses,
        [postId]: !wasLiked
      }
    }))

    setIsLiking(true)

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      })

      console.log("Like API response:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      type LikeApiResponse = {
        success: boolean;
        data?: {
          post: typeof post;
        };
        error?: string;
      }

      const data: LikeApiResponse = await response.json()

      console.log("Like API success:", data)

      if (data.success && data.data?.post) {
        // Server-authoritative state update
        setPost(data.data.post)
        // Refresh statuses to ensure consistency
        await fetchStatuses()
      } else {
        await fetchPost() // revert UI
        throw new Error(data.error || "Failed to like post")
      }
    } catch (error) {
      console.error("Error liking post:", error)
      // Revert optimistic updates
      await fetchPost()
      await fetchStatuses()
      toast({
        title: "Error",
        description: "Failed to like post. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLiking(false)
    }
  }

  // FIXED: Save functionality with batch status integration
  const handleSave = async () => {
    if (!post || isSaving) return

    if (!isSignedIn) {
      alert('Please log in to save posts')
      return
    }

    console.log("Starting save action:", { postId, currentUserId })
    const wasSaved = statuses.saveStatuses[postId]?.saved || false

    // Optimistic update
    setIsSaved(!wasSaved)
    setStatuses(prev => ({
      ...prev,
      saveStatuses: {
        ...prev.saveStatuses,
        [postId]: { saved: !wasSaved, savedAt: !wasSaved ? new Date().toISOString() : undefined }
      }
    }))

    setIsSaving(true)
    try {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUserId }),
      })

      console.log('Save API response:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Save API success:', data)
        if (data.success) {
          // Update status from server response
          if (data.data?.saved !== undefined) {
            setIsSaved(data.data.saved)
            setStatuses(prev => ({
              ...prev,
              saveStatuses: {
                ...prev.saveStatuses,
                [postId]: { 
                  saved: data.data.saved, 
                  savedAt: data.data.savedAt 
                }
              }
            }))
          }
        } else {
          // Revert optimistic update on error
          setIsSaved(wasSaved)
          setStatuses(prev => ({
            ...prev,
            saveStatuses: {
              ...prev.saveStatuses,
              [postId]: { saved: wasSaved }
            }
          }))
          alert(data.error || 'Failed to save post')
        }
      } else {
        // Revert optimistic update on error
        setIsSaved(wasSaved)
        setStatuses(prev => ({
          ...prev,
          saveStatuses: {
            ...prev.saveStatuses,
            [postId]: { saved: wasSaved }
          }
        }))
        alert('Failed to save post')
      }
    } catch (error) {
      console.error('Error saving post:', error)
      // Revert optimistic update on error
      setIsSaved(wasSaved)
      setStatuses(prev => ({
        ...prev,
        saveStatuses: {
          ...prev.saveStatuses,
          [postId]: { saved: wasSaved }
        }
      }))
      alert('Failed to save post')
    } finally {
      setIsSaving(false)
    }
  }

  // FIXED: Follow functionality with batch status integration
  const handleFollow = async () => {
    if (!post?.author?._id) {
      console.log("Follow prevented: No author ID")
      return
    }

    if (!isSignedIn) {
      alert("Please log in to follow users")
      return
    }

    const authorId = post.author._id
    const previousIsFollowing = statuses.followStatuses[authorId] || false
    const previousFollowerCount = optimisticFollowers

    console.log("Starting follow action:", {
      authorId,
      currentUserId,
      previousIsFollowing,
      previousFollowerCount,
    })

    // Optimistic UI update
    setIsFollowing(!previousIsFollowing)
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

    try {
      const response = await fetch(`/api/users/${authorId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      console.log("Follow API response:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      type FollowApiResponse = {
        success: boolean;
        data?: {
          following: boolean;
        };
        error?: string;
      }

      const result: FollowApiResponse = await response.json()

      console.log("Follow API success:", result)

      if (!result.success) {
        throw new Error(result.error || "Follow request failed")
      }

      // If server returned proper state, use it
      if (result.data) {
        const following = result.data.following

        setIsFollowing(following)
        setStatuses(prev => ({
          ...prev,
          followStatuses: {
            ...prev.followStatuses,
            [authorId]: following
          }
        }))

        // Adjust follower count to actual value
        setOptimisticFollowers(prev =>
          following
            ? previousIsFollowing
              ? prev // no change
              : prev + 1
            : previousIsFollowing
            ? prev - 1
            : prev
        )

        toast({
          title: following ? "Following" : "Unfollowed",
          description: following
            ? `You are now following ${post.author.firstName}`
            : `You unfollowed ${post.author.firstName}`,
          duration: 3000,
        })
      }
    } catch (error) {
      console.error("Error following user:", error)

      // Revert optimistic update
      setIsFollowing(previousIsFollowing)
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
        description:
          (error as Error).message ||
          "Failed to follow user. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  // FIXED: Comment functionality with proper API integration
  const handleAddComment = async () => {
    if (!commentText.trim() || !post || isCommenting) {
      console.log('Comment prevented:', { 
        hasText: !!commentText.trim(), 
        hasPost: !!post, 
        isCommenting
      })
      return
    }

    if (!isSignedIn) {
      alert('Please log in to comment')
      return
    }

    const tempCommentId = `temp-${Date.now()}`
    const originalCommentText = commentText.trim()
    
    // Create temp comment with Clerk user data
    const tempComment: Comment = {
      _id: tempCommentId,
      user: {
        _id: currentUserId,
        clerkId: (currentUser as any).clerkId ?? currentUser.id ?? "",
        username: currentUser?.username || 'user',
        firstName: currentUser?.firstName || 'User',
        lastName: currentUser?.lastName || '',
        avatar: currentUser?.imageUrl || '',
        email: currentUser?.primaryEmailAddress?.emailAddress || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      text: originalCommentText,
      likes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    console.log('Adding comment:', { tempCommentId, text: originalCommentText })

    // Optimistic update
    setPost(prev => prev ? {
      ...prev,
      comments: [...(prev.comments || []), tempComment]
    } : null)
    
    const previousCommentText = commentText
    setCommentText('')
    setIsCommenting(true)

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: originalCommentText
        }),
      })

      console.log('Comment API response:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Comment API success:', data)
        
        if (data.success && data.data) {
          // Use server response data
          setPost(data.data)
        } else {
          // Remove temp comment on error
          setPost(prev => prev ? {
            ...prev,
            comments: prev.comments?.filter(comment => comment._id !== tempCommentId) || []
          } : null)
          setCommentText(previousCommentText)
          console.error('Comment API returned error:', data.error)
          alert(data.error || 'Failed to post comment')
        }
      } else {
        // Remove temp comment on error
        setPost(prev => prev ? {
          ...prev,
          comments: prev.comments?.filter(comment => comment._id !== tempCommentId) || []
        } : null)
        setCommentText(previousCommentText)
        console.error('Comment API failed with status:', response.status)
        alert('Failed to post comment. Please try again.')
      }
    } catch (error) {
      // Remove temp comment on error
      setPost(prev => prev ? {
        ...prev,
        comments: prev.comments?.filter(comment => comment._id !== tempCommentId) || []
      } : null)
      setCommentText(previousCommentText)
      console.error('Error adding comment:', error)
      alert('Failed to post comment. Please check your connection and try again.')
    } finally {
      setIsCommenting(false)
    }
  }

  // FIXED: Delete comment functionality
  const handleDeleteComment = async (commentId: string) => {
    if (!isSignedIn) {
      alert('Please log in to delete comments')
      return
    }

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Remove comment from state
          setPost(prev => prev ? {
            ...prev,
            comments: prev.comments?.filter(comment => comment._id !== commentId) || []
          } : null)
        } else {
          alert(data.error || 'Failed to delete comment')
        }
      } else {
        alert('Failed to delete comment')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
    }
  }

  // FIXED: Like comment functionality
  const handleLikeComment = async (commentId: string) => {
    if (!isSignedIn) {
      alert('Please log in to like comments')
      return
    }

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUserId }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          // Update comment likes in state
          setPost(prev => {
            if (!prev) return null
            return {
              ...prev,
              comments: prev.comments?.map(comment => 
                comment._id === commentId 
                  ? { ...comment, likes: data.data.likes }
                  : comment
              ) || []
            }
          })
        }
      }
    } catch (error) {
      console.error('Error liking comment:', error)
    }
  }

  const handleShare = async (method: 'link' | 'social' = 'link') => {
    setShowShareMenu(false)
    
    if (method === 'link') {
      try {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Failed to copy link:', error)
      }
    } else if (method === 'social' && navigator.share) {
      try {
        await navigator.share({
          title: `Check out this design by ${post?.author.firstName} ${post?.author.lastName}`,
          text: post?.caption,
          url: window.location.href,
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    }
  }

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVideoProgress = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setVideoProgress(progress)
    }
  }

  // Get like status from batch statuses
  const isLiked = statuses.likeStatuses[postId] || false

  // Check if current user is comment author
  const isCommentAuthor = (commentUserId: string) => {
    return commentUserId === currentUserId
  }

  // Check if current user liked a comment
  const isCommentLiked = (comment: Comment) => {
    return comment.likes?.some(
      (like: any) => 
        (typeof like === 'string' && like === currentUserId) ||
        (like._id && like._id === currentUserId) ||
        (like.id && like.id === currentUserId)
    ) || false
  }

  // Get follower count with optimistic updates
  const getFollowerCount = () => {
    return optimisticFollowers > 0 ? optimisticFollowers : 
      (Array.isArray(post?.author?.followers) ? post.author.followers.length : 0)
  }

  // Get following count
  const getFollowingCount = () => {
    if (!post?.author?.following) return 0
    return Array.isArray(post.author.following) ? post.author.following.length : 0
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

  // Refresh statuses when user signs in/out
  useEffect(() => {
    if (post && userLoaded) {
      if (isSignedIn) {
        fetchStatuses()
      } else {
        // Reset statuses when user logs out
        setStatuses({
          likeStatuses: {},
          saveStatuses: {},
          followStatuses: {}
        })
        setIsSaved(false)
        setIsFollowing(false)
      }
    }
  }, [post, userLoaded, isSignedIn, fetchStatuses])

  // Show loading while user is being loaded
  if (!userLoaded || loading) {
    return <LoadingState />
  }

  if (error || !post) {
    return <NotFoundState error={error} />
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
        className={`sticky top-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'bg-white/95 dark:bg-slate-900/95 shadow-2xl shadow-slate-200/30 dark:shadow-slate-800/30 border-b border-slate-200/50 dark:border-slate-700/50' 
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="rounded-2xl flex items-center space-x-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:block">Back</span>
              </Button>
            </motion.div>

            {/* Post Title */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden md:block text-center"
            >
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Design by {post.author.firstName}
              </h1>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSave}
                disabled={isSaving || !isSignedIn}
                className={`rounded-2xl transition-all duration-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg ${
                  isSaved 
                    ? 'text-yellow-600 hover:text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg shadow-yellow-500/10' 
                    : 'hover:text-yellow-600'
                } ${!isSignedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                )}
              </Button>
              
              <div className="relative" ref={shareRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="rounded-2xl hover:text-green-600 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg transition-all duration-300"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 top-12 z-50 w-56 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 p-2"
                    >
                      <div className="px-3 py-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Share Design</p>
                      </div>
                      <div className="space-y-1 py-2">
                        <button
                          onClick={() => handleShare('link')}
                          className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                            {copied ? (
                              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm">
                              {copied ? 'Link Copied!' : 'Copy Link'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {copied ? 'Ready to share!' : 'Copy post URL to clipboard'}
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleShare('social')}
                          className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                            <Share2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-sm">Share via...</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Share with other apps</div>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Options Menu */}
              <div className="relative" ref={optionsRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                  className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg transition-all duration-300"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>

                <AnimatePresence>
                  {showOptionsMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute right-0 top-12 z-50 w-64 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200/60 dark:border-slate-700/60 p-2"
                    >
                      <div className="px-3 py-2 border-b border-slate-200/60 dark:border-slate-700/60">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Post Options</p>
                      </div>
                      <div className="space-y-1 py-2">
                        {currentUserId === post.author._id ? (
                          <>
                            <button 
                              onClick={() => {
                                console.log('Edit post:', post._id)
                                setShowOptionsMenu(false)
                              }}
                              className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
                            >
                              <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-sm font-medium">Edit Post</span>
                            </button>
                            <button 
                              onClick={() => {
                                console.log('Delete post:', post._id)
                                setShowOptionsMenu(false)
                              }}
                              className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all duration-200 group"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="text-sm font-medium">Delete Post</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => {
                                handleFollow()
                                setShowOptionsMenu(false)
                              }}
                              className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 group"
                            >
                              {isFollowing ? (
                                <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              )}
                              <span className="text-sm font-medium">
                                {isFollowing ? 'Unfollow User' : 'Follow User'}
                              </span>
                            </button>
                            <button 
                              onClick={() => {
                                if (!isSignedIn) {
                                  alert('Please log in to report posts')
                                  return
                                }
                                console.log('Report post:', post._id)
                                setShowOptionsMenu(false)
                              }}
                              className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all duration-200 group"
                            >
                              <Flag className="w-4 h-4" />
                              <span className="text-sm font-medium">Report Post</span>
                            </button>
                          </>
                        )}
                        <button className="flex items-center space-x-3 w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 group">
                          <Download className="w-4 h-4" />
                          <span className="text-sm font-medium">Download</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 xl:grid-cols-4 gap-8"
          >
            {/* Left Column - Media & Engagement */}
            <div className="xl:col-span-3 space-y-6">
              {/* Enhanced Media Card */}
              <Card className="rounded-3xl border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-slate-200/20 dark:shadow-slate-800/20 hover:shadow-2xl hover:shadow-slate-300/30 dark:hover:shadow-slate-700/30 transition-all duration-500">
                {/* Media Container */}
                <div 
                  className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 group overflow-hidden"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  {post.media.length > 0 && (
                    <>
                      {post.media[currentMediaIndex]?.type === 'video' ? (
                        <div className="relative w-full h-full">
                          <video
                            ref={videoRef}
                            src={post.media[currentMediaIndex].url}
                            poster={post.media[currentMediaIndex].thumbnail}
                            muted={isMuted}
                            onTimeUpdate={handleVideoProgress}
                            onEnded={() => setIsPlaying(false)}
                            className="w-full h-full object-cover"
                            playsInline
                          />
                          
                          {/* Video Controls */}
                          <div className={cn(
                            "absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent transition-all duration-300",
                            (isHovered || isPlaying) ? "opacity-100" : "opacity-0"
                          )}>
                            <div className="absolute bottom-4 left-4 right-4">
                              {/* Progress Bar */}
                              <div className="w-full bg-slate-600/50 rounded-full h-1.5 mb-3 backdrop-blur-sm">
                                <div 
                                  className="bg-white rounded-full h-1.5 transition-all duration-100 shadow-lg"
                                  style={{ width: `${videoProgress}%` }}
                                />
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={togglePlay}
                                    className="w-9 h-9 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:scale-110 transition-all"
                                  >
                                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleMute}
                                    className="w-9 h-9 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:scale-110 transition-all"
                                  >
                                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                  </Button>
                                  <span className="text-white text-sm font-medium">
                                    {post.media[currentMediaIndex].duration && 
                                      new Date(post.media[currentMediaIndex].duration * 1000).toISOString().substr(14, 5)
                                    }
                                  </span>
                                </div>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-9 h-9 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 hover:scale-110 transition-all"
                                  onClick={() => window.open(post.media[currentMediaIndex].url, '_blank')}
                                >
                                  <ZoomIn className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 1.1 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.8 }}
                          className="relative w-full h-full"
                        >
                          {!imageLoaded && (
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 animate-pulse" />
                          )}
                          <img
                            src={post.media[currentMediaIndex].url}
                            alt={post.caption}
                            className={cn(
                              "w-full h-full object-cover transition-all duration-700",
                              imageLoaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0'
                            )}
                            onLoad={() => setImageLoaded(true)}
                          />
                        </motion.div>
                      )}
                    </>
                  )}

                  {/* Media Navigation */}
                  {post.media.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentMediaIndex(prev => (prev - 1 + post.media.length) % post.media.length)}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/70 hover:scale-110"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => setCurrentMediaIndex(prev => (prev + 1) % post.media.length)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/70 hover:scale-110"
                      >
                        →
                      </button>
                      
                      {/* Media Indicators */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {post.media.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentMediaIndex(index)}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all duration-300 backdrop-blur-sm",
                              index === currentMediaIndex 
                                ? "bg-white w-6 shadow-lg" 
                                : "bg-white/50 hover:bg-white/80"
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Media Badges */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    {post.isFeatured && (
                      <Badge className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg backdrop-blur-sm">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {post.aiGenerated && (
                      <Badge variant="secondary" className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-lg backdrop-blur-sm">
                        <Zap className="w-3 h-3 mr-1" />
                        AI Generated
                      </Badge>
                    )}
                    {post.availableForSale && (
                      <Badge variant="secondary" className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-lg backdrop-blur-sm">
                        <ShoppingBag className="w-3 h-3 mr-1" />
                        For Sale
                      </Badge>
                    )}
                    {post.collaboration && (
                      <Badge variant="secondary" className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-lg backdrop-blur-sm">
                        <Users className="w-3 h-3 mr-1" />
                        Collaboration
                      </Badge>
                    )}
                  </div>

                  {/* Purchase Overlay */}
                  {post.availableForSale && post.price && (
                    <div className="absolute top-4 right-4">
                      <Button
                        onClick={() => console.log('Purchase:', post._id)}
                        size="sm"
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 backdrop-blur-sm border-0"
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        ${post.price} {post.currency}
                      </Button>
                    </div>
                  )}

                  {/* Engagement Overlay */}
                  <div className="absolute bottom-16 left-4 flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-white text-sm bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                      <Eye className="w-3.5 h-3.5" />
                      <span className="font-medium">{post.views?.toLocaleString() || 0}</span>
                    </div>
                    {post.engagement && post.engagement > 0 && (
                      <div className="flex items-center space-x-1 text-white text-sm bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span className="font-medium">{post.engagement}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced Engagement Stats */}
                <CardContent className="p-6 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <motion.div 
                      className="text-center group cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.button
                        onClick={handleLike}
                        disabled={isLiking || !isSignedIn}
                        className={`p-4 rounded-2xl transition-all duration-300 w-full group ${
                          isLiked 
                            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200/60 dark:border-slate-700/60'
                        } ${!isSignedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isLiking ? (
                          <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                        ) : (
                          <Heart className={`w-5 h-5 mx-auto ${isLiked ? 'fill-current' : ''}`} />
                        )}
                      </motion.button>
                      <p className="text-sm font-semibold mt-2 text-slate-900 dark:text-white">
                        {post.likes?.length || 0}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-rose-500 transition-colors">
                        Likes
                      </p>
                    </motion.div>

                    <motion.div 
                      className="text-center group cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all duration-300">
                        <MessageCircle className="w-5 h-5 mx-auto" />
                      </div>
                      <p className="text-sm font-semibold mt-2 text-slate-900 dark:text-white">
                        {post.comments?.length || 0}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors">
                        Comments
                      </p>
                    </motion.div>

                    <motion.div 
                      className="text-center group cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 group-hover:bg-green-100 dark:group-hover:bg-green-900/20 group-hover:text-green-600 dark:group-hover:text-green-400 transition-all duration-300">
                        <Eye className="w-5 h-5 mx-auto" />
                      </div>
                      <p className="text-sm font-semibold mt-2 text-slate-900 dark:text-white">
                        {post.views?.toLocaleString() || 0}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-green-500 transition-colors">
                        Views
                      </p>
                    </motion.div>

                    <motion.div 
                      className="text-center group cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.button
                        onClick={handleSave}
                        disabled={isSaving || !isSignedIn}
                        className={`p-4 rounded-2xl transition-all duration-300 w-full group ${
                          isSaved 
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg shadow-yellow-500/25' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200/60 dark:border-slate-700/60'
                        } ${!isSignedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isSaving ? (
                          <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                        ) : (
                          <Bookmark className={`w-5 h-5 mx-auto ${isSaved ? 'fill-current' : ''}`} />
                        )}
                      </motion.button>
                      <p className="text-sm font-semibold mt-2 text-slate-900 dark:text-white">
                        {post.saves?.length || 0}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-yellow-500 transition-colors">
                        Saves
                      </p>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>

              {/* Comments Section */}
              <Card className="rounded-3xl border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-2xl shadow-slate-200/20 dark:shadow-slate-800/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-bold text-xl text-slate-900 dark:text-white flex items-center">
                      <MessageCircle className="w-5 h-5 mr-3 text-blue-500" />
                      Comments ({post.comments?.length || 0})
                    </h4>
                    <Badge variant="outline" className="rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                      {post.comments?.length || 0} total
                    </Badge>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    <AnimatePresence>
                      {post.comments?.map((comment, index) => (
                        <motion.div
                          key={comment._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start space-x-4 group p-3 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-300"
                        >
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="cursor-pointer flex-shrink-0"
                            onClick={() => router.push(`/profile/${comment.user.username}`)}
                          >
                            <Avatar className="w-10 h-10 ring-2 ring-white dark:ring-slate-800 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-800 shadow-lg">
                              <AvatarImage src={comment.user.avatar} />
                              <AvatarFallback className="text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold">
                                {comment.user.firstName[0]}{comment.user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <motion.p 
                                className="font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                onClick={() => router.push(`/profile/${comment.user.username}`)}
                                whileHover={{ x: 2 }}
                              >
                                {comment.user.username}
                              </motion.p>
                              <div className="flex items-center space-x-1">
                                {comment.user.isVerified && (
                                  <Verified className="w-3 h-3 text-blue-500 fill-current" />
                                )}
                                {comment.user.isPro && (
                                  <Crown className="w-3 h-3 text-amber-500 fill-current" />
                                )}
                              </div>
                              <span className="text-xs text-slate-500">•</span>
                              <span className="text-xs text-slate-500">{getTimeAgo(comment.createdAt)}</span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {comment.text}
                            </p>
                            <div className="flex items-center space-x-4 mt-2">
                              <button 
                                onClick={() => handleLikeComment(comment._id)}
                                disabled={!isSignedIn}
                                className={`flex items-center space-x-1 text-xs transition-colors ${
                                  isCommentLiked(comment) 
                                    ? 'text-rose-500' 
                                    : 'text-slate-500 hover:text-rose-500'
                                } ${!isSignedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <ThumbsUp className={`w-3 h-3 ${isCommentLiked(comment) ? 'fill-current' : ''}`} />
                                <span>{comment.likes?.length || 0}</span>
                              </button>
                              <button className="text-xs text-slate-500 hover:text-blue-500 transition-colors">
                                Reply
                              </button>
                              {isCommentAuthor(comment.user._id) && (
                                <button 
                                  onClick={() => handleDeleteComment(comment._id)}
                                  className="text-xs text-red-500 hover:text-red-600 transition-colors"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Add Comment */}
                  <div className="flex items-start space-x-4">
                    <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-white dark:ring-slate-800 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-800 shadow-lg">
                      <AvatarImage src={currentUser?.imageUrl} />
                      <AvatarFallback className="text-xs bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold">
                        {isSignedIn ? (
                          `${currentUser?.firstName?.[0] || ''}${currentUser?.lastName?.[0] || ''}`
                        ) : (
                          'CU'
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 relative">
                      <Input
                        placeholder={isSignedIn ? "Add a comment..." : "Please log in to comment"}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && isSignedIn) {
                            e.preventDefault()
                            handleAddComment()
                          }
                        }}
                        disabled={!isSignedIn}
                        className="rounded-2xl pr-12 bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm border-2 border-slate-200/60 dark:border-slate-700/60 focus:border-rose-500 dark:focus:border-rose-400 transition-colors duration-300 h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {isSignedIn && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleAddComment}
                          disabled={!commentText.trim() || isCommenting}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/40 transition-all duration-300"
                        >
                          {isCommenting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Details & Author */}
            <div className="xl:col-span-1 space-y-6">
              {/* Enhanced Author Card */}
              <Card className="rounded-3xl border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-2xl shadow-slate-200/20 dark:shadow-slate-800/20 hover:shadow-2xl hover:shadow-slate-300/30 dark:hover:shadow-slate-700/30 transition-all duration-500">
                <CardContent className="p-6">
                  <div className="text-center">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="cursor-pointer mx-auto w-20 h-20 mb-4"
                      onClick={() => router.push(`/profile/${post.author.username}`)}
                    >
                      <Avatar className="w-20 h-20 ring-4 ring-white dark:ring-slate-800 ring-offset-4 ring-offset-slate-100 dark:ring-offset-slate-800 shadow-2xl mx-auto">
                        <AvatarImage src={post.author.avatar} />
                        <AvatarFallback className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold text-lg shadow-inner">
                          {post.author.firstName[0]}{post.author.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <motion.h3 
                          className="font-bold text-xl cursor-pointer hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-center"
                          onClick={() => router.push(`/profile/${post.author.username}`)}
                          whileHover={{ x: 2 }}
                        >
                          {post.author.firstName} {post.author.lastName}
                        </motion.h3>
                        <div className="flex items-center space-x-1">
                          {post.author.isVerified && (
                            <Verified className="w-4 h-4 text-blue-500 fill-current" />
                          )}
                          {post.author.isPro && (
                            <Crown className="w-4 h-4 text-amber-500 fill-current" />
                          )}
                        </div>
                      </div>
                      <motion.p 
                        className="text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors text-center"
                        onClick={() => router.push(`/profile/${post.author.username}`)}
                      >
                        @{post.author.username}
                      </motion.p>
                    </div>
                    
                    {/* Enhanced Follower Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <motion.div 
                        className="text-center group cursor-pointer p-3 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        onClick={() => router.push(`/profile/${post.author.username}?tab=followers`)}
                      >
                        <p className="font-bold text-slate-900 dark:text-white text-2xl">
                          {getFollowerCount().toLocaleString()}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 group-hover:text-rose-500 transition-colors flex items-center justify-center space-x-1 text-sm">
                          <User className="w-3 h-3" />
                          <span>Followers</span>
                        </p>
                      </motion.div>
                      <motion.div 
                        className="text-center group cursor-pointer p-3 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-300"
                        whileHover={{ scale: 1.05 }}
                        onClick={() => router.push(`/profile/${post.author.username}?tab=following`)}
                      >
                        <p className="font-bold text-slate-900 dark:text-white text-2xl">
                          {getFollowingCount().toLocaleString()}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors flex items-center justify-center space-x-1 text-sm">
                          <User className="w-3 h-3" />
                          <span>Following</span>
                        </p>
                      </motion.div>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={handleFollow}
                        disabled={!isSignedIn}
                        className={`w-full rounded-2xl transition-all duration-300 h-12 text-base font-semibold ${
                          isFollowing
                            ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600'
                            : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/40'
                        } ${!isSignedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isFollowing ? (
                          <UserCheck className="w-4 h-4 mr-2" />
                        ) : (
                          <UserPlus className="w-4 h-4 mr-2" />
                        )}
                        {isFollowing ? 'Following' : 'Follow Designer'}
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Post Details */}
              <Card className="rounded-3xl border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-2xl shadow-slate-200/20 dark:shadow-slate-800/20">
                <CardContent className="p-6">
                  <h4 className="font-bold text-lg mb-4 text-slate-900 dark:text-white flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-amber-500" />
                    Design Details
                  </h4>

                  {/* Caption */}
                  <div className="mb-6">
                    <p className="text-slate-900 dark:text-white leading-relaxed text-base">
                      {post.caption}
                    </p>
                  </div>

                  {/* Hashtags */}
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {post.hashtags.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="outline"
                          className="rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-md text-xs"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Enhanced Post Metadata */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400 p-3 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-300">
                      <Calendar className="w-4 h-4 text-rose-500" />
                      <span>{new Date(post.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                    
                    {post.location && (
                      <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400 p-3 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-300">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span>{post.location}</span>
                      </div>
                    )}

                    {post.category && (
                      <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400 p-3 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-300">
                        <Tag className="w-4 h-4 text-green-500" />
                        <span className="capitalize">{post.category}</span>
                      </div>
                    )}

                    {post.engagement && (
                      <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400 p-3 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-300">
                        <BarChart3 className="w-4 h-4 text-purple-500" />
                        <span>{post.engagement}% engagement rate</span>
                      </div>
                    )}

                    {post.shares && post.shares > 0 && (
                      <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400 p-3 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-300">
                        <Share2 className="w-4 h-4 text-emerald-500" />
                        <span>{post.shares} shares</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Related Tags & Actions */}
              <Card className="rounded-3xl border-2 border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-2xl shadow-slate-200/20 dark:shadow-slate-800/20">
                <CardContent className="p-6">
                  <h4 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Design Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {post.tags?.map((tag, index) => (
                      <Badge 
                        key={index}
                        variant="secondary"
                        className="rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer transition-all duration-300 hover:scale-105 text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Add custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  )
}

// Loading State Component
const LoadingState = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/30 to-purple-50/20 dark:from-slate-900 dark:via-rose-900/10 dark:to-purple-900/10 flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-4 border-rose-200 dark:border-rose-800 border-t-rose-500 rounded-full mx-auto mb-4"
      />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-slate-600 dark:text-slate-400 flex items-center justify-center space-x-2 text-lg"
      >
        <Rocket className="w-5 h-5" />
        <span>Loading amazing design...</span>
      </motion.p>
    </motion.div>
  </div>
)

// Not Found State Component
const NotFoundState = ({ error }: { error?: string | null }) => {
  const router = useRouter()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/30 to-purple-50/20 dark:from-slate-900 dark:via-rose-900/10 dark:to-purple-900/10 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md mx-auto p-8"
      >
        <Card className="rounded-3xl border-2 border-dashed border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <Sparkles className="w-10 h-10 text-rose-400" />
            </motion.div>
            <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white mb-3">
              Design Not Found
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {error || "The design you're looking for doesn't exist or has been removed."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => router.back()}
                className="rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/40 transition-all duration-300"
              >
                Go Back
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/explore')}
                className="rounded-2xl border-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300"
              >
                Explore Designs
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}