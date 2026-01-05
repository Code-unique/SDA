// app/posts/[id]/page.tsx
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
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Image as ImageIcon,
  Video,
  Sparkles,
  Verified,
  Crown,
  UserPlus,
  UserCheck,
  MapPin,
  Calendar,
  Tag,
  ShoppingBag,
  MoreHorizontal,
  Send,
  ThumbsUp,
  Trash2,
  Edit,
  Flag,
  Download,
  Copy,
  Check,
  TrendingUp,
  RefreshCw,
  Hash,
  Flame,
  Eye,
  Clock,
  Star,
  Zap,
  Users,
  ExternalLink,
  HeartOff,
  BookmarkPlus,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Smile,
  AtSign,
  Hash as HashIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

// Define interfaces
interface MediaItem {
  url: string;
  type: 'image' | 'video';
  order: number;
  thumbnail?: string;
  duration?: number;
}

interface PostUser {
  _id: string;
  clerkId: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
  email: string;
  isVerified: boolean;
  isPro: boolean;
  followers: string[];
  following: string[];
  badges?: string[];
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

interface Comment {
  _id: string;
  text: string;
  user: PostUser;
  post: string;
  likes: string[];
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

interface Post {
  _id: string;
  caption: string;
  content: string;
  media: MediaItem[];
  author: PostUser;
  likes: string[];
  saves: string[];
  comments: Comment[];
  tags: string[];
  hashtags?: string[];
  category?: string;
  location?: string;
  isFeatured: boolean;
  aiGenerated?: boolean;
  availableForSale?: boolean;
  collaboration?: boolean;
  price?: number;
  currency?: string;
  views?: number;
  engagement?: number;
  shares?: number;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

interface TrendingHashtag {
  tag: string;
  count: number;
  trendScore?: number;
  lastUsed?: string;
}

interface BatchStatuses {
  likeStatuses: Record<string, boolean>;
  saveStatuses: Record<string, { saved: boolean; savedAt?: string }>;
  followStatuses: Record<string, boolean>;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;
  
  const { user: currentUser, isLoaded: userLoaded, isSignedIn } = useUser();
  const { toast } = useToast();
  
  // State
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [expandedComment, setExpandedComment] = useState<string | null>(null);
  const [activeCommentMenu, setActiveCommentMenu] = useState<string | null>(null);
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [statuses, setStatuses] = useState<BatchStatuses>({
    likeStatuses: {},
    saveStatuses: {},
    followStatuses: {}
  });

  // Refs
  const headerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  
  // Scroll animations
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [0, 1]);
  const headerScale = useTransform(scrollY, [0, 100], [0.95, 1]);

  // Current user ID
  const currentUserId = currentUser?.id || '';

  // Fetch post data
  const fetchPost = useCallback(async () => {
    if (!postId || !userLoaded) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/posts/${postId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const postData = data.data;
          setPost(postData);
          
          // Fetch statuses if signed in
          if (isSignedIn && postData._id) {
            try {
              const statusResponse = await fetch('/api/batch-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  postIds: [postData._id],
                  userIds: postData.author?._id ? [postData.author._id] : []
                })
              });

              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                if (statusData?.success && statusData.data) {
                  setStatuses(statusData.data);
                  setIsSaved(!!statusData.data.saveStatuses?.[postData._id]?.saved);
                  if (postData.author?._id) {
                    setIsFollowing(!!statusData.data.followStatuses?.[postData.author._id]);
                  }
                }
              }
            } catch (err) {
              console.error('Error fetching statuses:', err);
            }
          }

          // Fetch trending hashtags
          try {
            const hashtagsResponse = await fetch('/api/hashtags/trending');
            if (hashtagsResponse.ok) {
              const hashtagsData = await hashtagsResponse.json();
              if (hashtagsData.success && hashtagsData.hashtags) {
                setTrendingHashtags(hashtagsData.hashtags);
              }
            }
          } catch (error) {
            console.error('Error fetching trending hashtags:', error);
          }
        } else {
          setError(data.error || 'Failed to load post');
        }
      } else {
        setError('Failed to load post');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [postId, userLoaded, isSignedIn]);

  // Load post on mount
  useEffect(() => {
    if (postId && userLoaded) {
      fetchPost();
    }
  }, [postId, userLoaded]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close comment menu on outside click - FIXED
  useEffect(() => {
    const handleClickOutsideCommentMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (activeCommentMenu && !target.closest?.(`[data-comment="${activeCommentMenu}"]`)) {
        setActiveCommentMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideCommentMenu);
    return () => document.removeEventListener('mousedown', handleClickOutsideCommentMenu);
  }, [activeCommentMenu]);

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!mediaContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      mediaContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleVideoProgress = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(progress);
    }
  };

  // Handle like
  const handleLike = async () => {
    if (!post || isLiking) return;

    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to like posts",
        variant: "destructive"
      });
      return;
    }

    const wasLiked = statuses.likeStatuses[postId] || false;

    // Optimistic update
    setPost(prev => prev ? {
      ...prev,
      likes: wasLiked 
        ? prev.likes.filter(id => id !== currentUserId)
        : [...prev.likes, currentUserId]
    } : null);

    setStatuses(prev => ({
      ...prev,
      likeStatuses: { ...prev.likeStatuses, [postId]: !wasLiked }
    }));

    setIsLiking(true);

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      const data = await response.json();
      
      if (data.success && data.data?.post) {
        setPost(data.data.post);
      } else {
        await fetchPost();
        throw new Error(data.error || "Failed to like post");
      }
    } catch (error) {
      await fetchPost();
      toast({
        title: "Error",
        description: "Failed to like post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!post || isSaving) return;

    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to save posts",
        variant: "destructive"
      });
      return;
    }

    const wasSaved = statuses.saveStatuses[postId]?.saved || false;

    // Optimistic update
    setIsSaved(!wasSaved);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsSaved(data.data?.saved || !wasSaved);
          
          toast({
            title: wasSaved ? "Unsaved" : "Saved",
            description: wasSaved 
              ? "Post removed from your saves" 
              : "Post added to your saves",
          });
        }
      }
    } catch (error) {
      setIsSaved(wasSaved);
      toast({
        title: "Error",
        description: "Failed to save post",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle follow
  const handleFollow = async () => {
    if (!post?.author?._id) return;

    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to follow users",
        variant: "destructive"
      });
      return;
    }

    const authorId = post.author._id;
    const previousIsFollowing = statuses.followStatuses[authorId] || false;

    // Optimistic update
    setIsFollowing(!previousIsFollowing);

    try {
      const response = await fetch(`/api/users/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authorId })
      });

      if (!response.ok) throw new Error("Follow request failed");

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: !previousIsFollowing ? "Following" : "Unfollowed",
          description: !previousIsFollowing
            ? `You are now following ${post.author.firstName}`
            : `You unfollowed ${post.author.firstName}`,
        });
      }
    } catch (error) {
      setIsFollowing(previousIsFollowing);
      
      toast({
        title: "Error",
        description: "Failed to follow user",
        variant: "destructive"
      });
    }
  };

  // Handle comment
  const handleAddComment = async () => {
    if (!commentText.trim() || !post || isCommenting) {
      if (!isSignedIn) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to comment",
          variant: "destructive"
        });
      }
      return;
    }

    const tempCommentId = `temp-${Date.now()}`;
    const originalCommentText = commentText.trim();
    
    // Create temp comment
    const tempComment: Comment = {
      _id: tempCommentId,
      user: {
        _id: currentUserId,
        clerkId: currentUser?.id ?? "",
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
      text: originalCommentText,
      post: postId,
      likes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optimistic update
    setPost(prev => prev ? {
      ...prev,
      comments: [tempComment, ...(prev.comments || [])]
    } : null);
    
    setCommentText('');
    setIsCommenting(true);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalCommentText }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPost(data.data);
          toast({
            title: "Comment added",
            description: "Your comment has been posted"
          });
        } else {
          // Remove temp comment on error
          setPost(prev => prev ? {
            ...prev,
            comments: prev.comments?.filter(c => c._id !== tempCommentId) || []
          } : null);
          setCommentText(originalCommentText);
        }
      }
    } catch (error) {
      // Remove temp comment on error
      setPost(prev => prev ? {
        ...prev,
        comments: prev.comments?.filter(c => c._id !== tempCommentId) || []
      } : null);
      setCommentText(originalCommentText);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    } finally {
      setIsCommenting(false);
      // Auto-scroll to new comment
      setTimeout(() => {
        if (commentsContainerRef.current) {
          commentsContainerRef.current.scrollTop = 0;
        }
      }, 100);
    }
  };

  // Handle reply
  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim() || isReplying) return;

    const tempReplyId = `temp-reply-${Date.now()}`;
    const originalReplyText = replyText.trim();

    // Create temp reply
    const tempReply: Comment = {
      _id: tempReplyId,
      user: {
        _id: currentUserId,
        clerkId: currentUser?.id ?? "",
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
      text: originalReplyText,
      post: postId,
      likes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Optimistic update
    setPost(prev => {
      if (!prev) return null;
      return {
        ...prev,
        comments: prev.comments?.map(comment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), tempReply]
            };
          }
          return comment;
        }) || []
      };
    });

    setReplyText('');
    setIsReplying(true);
    setReplyToComment(null);

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: originalReplyText }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPost(data.data);
          toast({
            title: "Reply added",
            description: "Your reply has been posted"
          });
        } else {
          // Remove temp reply on error
          setPost(prev => {
            if (!prev) return null;
            return {
              ...prev,
              comments: prev.comments?.map(comment => {
                if (comment._id === commentId) {
                  return {
                    ...comment,
                    replies: comment.replies?.filter(r => r._id !== tempReplyId) || []
                  };
                }
                return comment;
              }) || []
            };
          });
          setReplyText(originalReplyText);
        }
      }
    } catch (error) {
      // Remove temp reply on error
      setPost(prev => {
        if (!prev) return null;
        return {
          ...prev,
          comments: prev.comments?.map(comment => {
            if (comment._id === commentId) {
              return {
                ...comment,
                replies: comment.replies?.filter(r => r._id !== tempReplyId) || []
              };
            }
            return comment;
          }) || []
        };
      });
      setReplyText(originalReplyText);
      toast({
        title: "Error",
        description: "Failed to add reply",
        variant: "destructive"
      });
    } finally {
      setIsReplying(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to delete comments",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPost(prev => prev ? {
            ...prev,
            comments: prev.comments?.filter(comment => comment._id !== commentId) || []
          } : null);
          
          toast({
            title: "Comment deleted",
            description: "Your comment has been deleted",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive"
      });
    }
  };

  // Like comment
  const handleLikeComment = async (commentId: string) => {
    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to like comments",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPost(prev => {
            if (!prev) return null;
            return {
              ...prev,
              comments: prev.comments?.map(comment => 
                comment._id === commentId 
                  ? { ...comment, likes: data.data.likes }
                  : comment
              ) || []
            };
          });
        }
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  // Handle share
  const handleShare = async (method: 'link' | 'social' = 'link') => {
    setShowShareMenu(false);
    
    if (method === 'link') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast({
          title: "Link copied!",
          description: "Post link copied to clipboard",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast({
          title: "Failed to copy",
          description: "Could not copy link to clipboard",
          variant: "destructive"
        });
      }
    } else if (method === 'social' && navigator.share) {
      try {
        await navigator.share({
          title: post?.caption || 'Check out this design',
          text: `Check out this design by ${post?.author.firstName}`,
          url: window.location.href,
        });
      } catch (error) {
        // Share dialog was cancelled
      }
    }
  };

  // Delete post
  const handleDeletePost = async () => {
    if (!post || !isSignedIn) return;

    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Post deleted",
          description: "Your post has been deleted",
        });
        router.push('/');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive"
      });
    }
  };

  // Helper functions
  const isLiked = statuses.likeStatuses[postId] || false;
  const isCommentAuthor = (commentUserId: string) => commentUserId === currentUserId;
  const isCommentLiked = (comment: Comment) => comment.likes?.some(like => like === currentUserId) || false;
  
  const getTimeAgo = (date: string): string => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Check if current media is video
  const isCurrentMediaVideo = post?.media?.[currentMediaIndex]?.type === 'video';

  // Format number
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Refresh statuses on auth change
  useEffect(() => {
    if (!userLoaded || !post) return;

    if (!isSignedIn) {
      setStatuses({
        likeStatuses: {},
        saveStatuses: {},
        followStatuses: {}
      });
      setIsSaved(false);
      setIsFollowing(false);
      return;
    }

    // Refresh statuses if user is signed in and we have a post
    const refreshStatuses = async () => {
      try {
        const response = await fetch('/api/batch-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postIds: [postId],
            userIds: post?.author?._id ? [post.author._id] : []
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.success && data.data) {
            setStatuses(data.data);
            setIsSaved(!!data.data.saveStatuses?.[postId]?.saved);
            if (post?.author?._id) {
              setIsFollowing(!!data.data.followStatuses?.[post.author._id]);
            }
          }
        }
      } catch (err) {
        console.error('Error refreshing statuses:', err);
      }
    };

    refreshStatuses();
  }, [userLoaded, isSignedIn, postId, post?._id, post?.author?._id]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Get trending color based on index
  const getTrendColor = (index: number) => {
    if (index === 0) return 'from-amber-500 to-orange-500';
    if (index === 1) return 'from-rose-500 to-pink-500';
    if (index === 2) return 'from-purple-500 to-pink-500';
    if (index < 5) return 'from-blue-500 to-cyan-500';
    if (index < 10) return 'from-emerald-500 to-teal-500';
    return 'from-slate-500 to-slate-600';
  };

  // Show loading state
  if (!userLoaded || loading) {
    return <LoadingState />;
  }

  // Show error state
  if (error || !post) {
    return <NotFoundState error={error} />;
  }

  const currentMedia = post.media[currentMediaIndex];
  const commentCount = post.comments?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-rose-950/20">
      {/* Glass Morphic Floating Header */}
      <motion.div
        ref={headerRef}
        style={{
          opacity: headerOpacity,
          scale: headerScale,
        }}
        className="fixed top-4 left-4 right-4 z-50"
      >
        <div className="flex items-center justify-between bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/20 dark:border-slate-700/50 shadow-2xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          {/* Post Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 px-3 py-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full">
              <div className="flex items-center gap-1.5">
                <Heart className={cn("w-3.5 h-3.5", isLiked ? "text-rose-500 fill-current" : "text-slate-500")} />
                <span className="text-sm font-medium">{formatNumber(post.likes?.length || 0)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm font-medium">{formatNumber(commentCount)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bookmark className={cn("w-3.5 h-3.5", isSaved ? "text-amber-500 fill-current" : "text-slate-500")} />
                <span className="text-sm font-medium">{formatNumber(post.saves?.length || 0)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              disabled={isSaving || !isSignedIn}
              className={cn(
                "w-9 h-9 rounded-full backdrop-blur-sm",
                isSaved 
                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-500" 
                  : "bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700"
              )}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
              )}
            </Button>
            
            <div className="relative" ref={shareRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="w-9 h-9 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              
              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 top-12 w-48 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 py-2"
                  >
                    <button
                      onClick={() => handleShare('link')}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors"
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
                    {typeof navigator.share === 'function' && (
                      <button
                        onClick={() => handleShare('social')}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <Share2 className="w-4 h-4 text-emerald-500" />
                        <span>Share via...</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Options menu */}
            <div className="relative" ref={optionsRef}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                className="w-9 h-9 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-700"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>

              <AnimatePresence>
                {showOptionsMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 top-12 w-56 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 py-2"
                  >
                    {currentUserId === post.author.clerkId ? (
                      <>
                        <button 
                          onClick={() => setShowOptionsMenu(false)}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <Edit className="w-4 h-4 text-blue-500" />
                          <span>Edit Post</span>
                        </button>
                        <button 
                          onClick={() => {
                            setShowOptionsMenu(false);
                            handleDeletePost();
                          }}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Post</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => {
                            handleFollow();
                            setShowOptionsMenu(false);
                          }}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          {isFollowing ? (
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <UserPlus className="w-4 h-4 text-blue-500" />
                          )}
                          <span>
                            {isFollowing ? 'Unfollow User' : 'Follow User'}
                          </span>
                        </button>
                        <button 
                          onClick={() => {
                            if (!isSignedIn) {
                              toast({
                                title: "Please sign in",
                                description: "You need to be signed in to report posts",
                                variant: "destructive"
                              });
                              return;
                            }
                            setShowOptionsMenu(false);
                            toast({
                              title: "Report submitted",
                              description: "Thank you for reporting this post. Our team will review it.",
                            });
                          }}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Flag className="w-4 h-4" />
                          <span>Report Post</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Column - Media */}
            <div className="lg:col-span-2">
              {/* Glass Morphic Media Container */}
              <div 
                ref={mediaContainerRef}
                className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-100/50 to-slate-200/50 dark:from-slate-800/50 dark:to-slate-900/50 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 shadow-2xl mb-6"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {currentMedia && (
                  <>
                    {isCurrentMediaVideo ? (
                      <div className="relative w-full">
                        <video
                          ref={videoRef}
                          src={currentMedia.url}
                          muted={isMuted}
                          onTimeUpdate={handleVideoProgress}
                          onEnded={() => setIsPlaying(false)}
                          className="w-full h-auto max-h-[75vh] object-contain"
                          playsInline
                        />
                        
                        {/* Video Controls */}
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-all duration-300",
                          (isHovered || isPlaying) ? "opacity-100" : "opacity-0"
                        )}>
                          <div className="absolute bottom-6 left-6 right-6">
                            {/* Progress Bar */}
                            <div className="w-full bg-white/20 backdrop-blur-lg rounded-full h-1.5 mb-4">
                              <div 
                                className="bg-gradient-to-r from-rose-500 to-pink-500 h-1.5 rounded-full transition-all duration-100"
                                style={{ width: `${videoProgress}%` }}
                              />
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={togglePlay}
                                  className="w-10 h-10 bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 hover:scale-110 transition-all"
                                >
                                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={toggleMute}
                                  className="w-10 h-10 bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 hover:scale-110 transition-all"
                                >
                                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={toggleFullscreen}
                                  className="w-10 h-10 bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 hover:scale-110 transition-all"
                                >
                                  {isFullscreen ? (
                                    <Minimize2 className="w-5 h-5" />
                                  ) : (
                                    <Maximize2 className="w-5 h-5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 1.05 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="relative w-full"
                      >
                        {!imageLoaded && (
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 animate-pulse" />
                        )}
                        <img
                          src={currentMedia.url}
                          alt={post.caption}
                          className={cn(
                            "w-full h-auto max-h-[75vh] object-contain transition-all duration-700",
                            imageLoaded ? 'opacity-100' : 'opacity-0'
                          )}
                          onLoad={() => setImageLoaded(true)}
                        />
                        
                        {/* Fullscreen button for images */}
                        <div className={cn(
                          "absolute inset-0 transition-opacity duration-300",
                          isHovered ? "opacity-100" : "opacity-0"
                        )}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleFullscreen}
                            className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-lg text-white hover:bg-black/70 hover:scale-110 transition-all"
                          >
                            <Maximize2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}

                {/* Media Navigation */}
                {post.media.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentMediaIndex(prev => (prev - 1 + post.media.length) % post.media.length)}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-lg text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentMediaIndex(prev => (prev + 1) % post.media.length)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-lg text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    {/* Media Indicators */}
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
                      {post.media.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentMediaIndex(index)}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all duration-300 backdrop-blur-lg",
                            index === currentMediaIndex 
                              ? "bg-white w-8" 
                              : "bg-white/50 hover:bg-white/80"
                          )}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Media Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-black/50 backdrop-blur-lg text-white border-0 px-3 py-1.5">
                    {isCurrentMediaVideo ? (
                      <>
                        <Video className="w-3.5 h-3.5 mr-1.5" />
                        Video
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                        Photo
                      </>
                    )}
                  </Badge>
                  {post.aiGenerated && (
                    <Badge className="rounded-full bg-gradient-to-r from-purple-600/90 to-violet-600/90 text-white border-0 backdrop-blur-lg px-3 py-1.5">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      AI Generated
                    </Badge>
                  )}
                  {post.availableForSale && post.price && (
                    <Badge className="rounded-full bg-gradient-to-r from-emerald-600/90 to-green-600/90 text-white border-0 backdrop-blur-lg px-3 py-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                      ${post.price}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Author & Caption Card */}
              <div className="rounded-3xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 shadow-xl mb-6 overflow-hidden">
                <div className="p-6">
                  {/* Author */}
                  <div className="flex items-center justify-between mb-4">
                    <Link 
                      href={`/profile/${post.author?.username}`} 
                      className="flex items-center gap-3 group/author"
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12 border-2 border-white/80 dark:border-slate-700/80">
                          <AvatarImage src={post.author?.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white font-semibold">
                            {post.author?.firstName?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        {post.author?.isVerified && (
                          <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full p-1 border-2 border-white/80 dark:border-slate-700/80">
                            <Verified className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white group-hover/author:text-rose-600 transition-colors">
                            {post.author?.firstName} {post.author?.lastName}
                          </p>
                          {post.author?.isPro && (
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          @{post.author?.username}
                        </p>
                      </div>
                    </Link>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFollow}
                      disabled={!isSignedIn}
                      className={cn(
                        "rounded-full px-4 py-2 backdrop-blur-sm",
                        isFollowing 
                          ? "bg-slate-100/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600" 
                          : "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 border-0"
                      )}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                          Follow
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Caption */}
                  <div className="mb-4">
                    <p className="text-slate-900 dark:text-white text-lg leading-relaxed">
                      {post.caption}
                    </p>
                  </div>

                  {/* Stats & Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleLike}
                        disabled={!isSignedIn || isLiking}
                        className={cn(
                          "flex items-center gap-2 transition-all duration-300 hover:scale-105",
                          isLiked ? "text-rose-500" : "text-slate-600 dark:text-slate-400 hover:text-rose-500",
                          !isSignedIn && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isLiking ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                        )}
                        <span className="font-semibold">{formatNumber(post.likes?.length || 0)}</span>
                      </button>

                      <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-all duration-300 hover:scale-105"
                      >
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-semibold">{formatNumber(commentCount)}</span>
                      </button>

                      <button
                        onClick={handleSave}
                        disabled={!isSignedIn || isSaving}
                        className={cn(
                          "flex items-center gap-2 transition-all duration-300 hover:scale-105",
                          isSaved ? "text-amber-500" : "text-slate-600 dark:text-slate-400 hover:text-amber-500",
                          !isSignedIn && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
                        )}
                        <span className="font-semibold">{formatNumber(post.saves?.length || 0)}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {getTimeAgo(post.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Toggle Button */}
              {!showComments && commentCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <Button
                    onClick={() => setShowComments(true)}
                    variant="outline"
                    className="w-full rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 h-12 group"
                  >
                    <MessageCircle className="w-4 h-4 mr-2 text-blue-500" />
                    <span className="text-slate-700 dark:text-slate-300">View {commentCount} comments</span>
                    <ChevronDown className="w-4 h-4 ml-2 text-slate-400 group-hover:translate-y-0.5 transition-transform" />
                  </Button>
                </motion.div>
              )}

              {/* STUNNING COMPACT COMMENTS SECTION */}
              <AnimatePresence>
                {showComments && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-3xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 shadow-xl overflow-hidden mb-6"
                  >
                    {/* Comments Header */}
                    <div className="sticky top-0 z-10 p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <MessageCircle className="w-6 h-6 text-blue-500" />
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                              {commentCount}
                            </div>
                          </div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                            Comments
                          </h3>
                        </div>
                        <button
                          onClick={() => setShowComments(false)}
                          className="w-9 h-9 rounded-full bg-slate-100/50 dark:bg-slate-700/50 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors hover:scale-105"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Compact Add Comment - Simplified without #/@ buttons */}
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border-2 border-white/80 dark:border-slate-700/80 flex-shrink-0">
                          <AvatarImage src={currentUser?.imageUrl} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-semibold">
                            {currentUser?.firstName?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="relative">
                            <Input
                              ref={commentInputRef}
                              placeholder={isSignedIn ? "Add a comment..." : "Please log in to comment"}
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && isSignedIn) {
                                  e.preventDefault();
                                  handleAddComment();
                                }
                              }}
                              disabled={!isSignedIn}
                              className="rounded-2xl pr-12 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 h-11 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                            {isSignedIn && (
                              <Button
                                size="icon"
                                onClick={handleAddComment}
                                disabled={!commentText.trim() || isCommenting}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 w-9 h-9 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                              >
                                {isCommenting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comments List */}
                    <div 
                      ref={commentsContainerRef}
                      className="max-h-[600px] overflow-y-auto custom-scrollbar"
                    >
                      {post.comments?.length > 0 ? (
                        <div className="p-4 space-y-2">
                          {post.comments.map((comment) => (
                            <div key={comment._id} className="group relative">
                              {/* Main Comment */}
                              <div className={cn(
                                "flex items-start gap-3 p-3 rounded-2xl transition-all duration-300",
                                expandedComment === comment._id 
                                  ? "bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30" 
                                  : "hover:bg-slate-100/30 dark:hover:bg-slate-700/30"
                              )}>
                                {/* User Avatar */}
                                <Link href={`/profile/${comment.user.username}`} className="flex-shrink-0">
                                  <Avatar className="w-10 h-10 ring-2 ring-white/50 dark:ring-slate-700/50">
                                    <AvatarImage src={comment.user.avatar} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-sm font-semibold">
                                      {comment.user.firstName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                </Link>

                                {/* Comment Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Link 
                                          href={`/profile/${comment.user.username}`}
                                          className="font-semibold text-sm text-slate-900 dark:text-white hover:text-blue-600 transition-colors"
                                        >
                                          {comment.user.username}
                                        </Link>
                                        {comment.user.isVerified && (
                                          <Verified className="w-3.5 h-3.5 text-blue-500" />
                                        )}
                                        {comment.user.isPro && (
                                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                                        )}
                                      </div>
                                      
                                      <p className="text-slate-800 dark:text-slate-200 text-sm mb-2 leading-relaxed">
                                        {comment.text}
                                      </p>
                                    </div>
                                    
                                    {/* Comment Menu */}
                                    <div className="relative" data-comment={comment._id}>
                                      <button
                                        onClick={() => setActiveCommentMenu(
                                          activeCommentMenu === comment._id ? null : comment._id
                                        )}
                                        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors opacity-0 group-hover:opacity-100"
                                      >
                                        <MoreVertical className="w-4 h-4 text-slate-500" />
                                      </button>
                                      
                                      <AnimatePresence>
                                        {activeCommentMenu === comment._id && (
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            className="absolute right-0 top-8 z-50 w-48 bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 dark:border-slate-700/50 py-2"
                                          >
                                            <button
                                              onClick={() => {
                                                setReplyToComment(comment._id);
                                                setReplyText(`@${comment.user.username} `);
                                                setActiveCommentMenu(null);
                                                // FIXED: Use proper type assertion for focus
                                                setTimeout(() => {
                                                  const replyInput = document.querySelector(`[data-reply-input="${comment._id}"]`) as HTMLInputElement;
                                                  replyInput?.focus();
                                                }, 100);
                                              }}
                                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                              <span>Reply</span>
                                            </button>
                                            <button 
                                              onClick={() => handleLikeComment(comment._id)}
                                              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                              <Heart className={cn("w-3.5 h-3.5", isCommentLiked(comment) ? "text-rose-500 fill-current" : "text-rose-500")} />
                                              <span>{isCommentLiked(comment) ? 'Unlike' : 'Like'}</span>
                                            </button>
                                            {isCommentAuthor(comment.user._id) && (
                                              <button 
                                                onClick={() => {
                                                  setActiveCommentMenu(null);
                                                  handleDeleteComment(comment._id);
                                                }}
                                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Delete</span>
                                              </button>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                  
                                  {/* Comment Actions */}
                                  <div className="flex items-center gap-4">
                                    <button 
                                      onClick={() => handleLikeComment(comment._id)}
                                      disabled={!isSignedIn}
                                      className={cn(
                                        "flex items-center gap-1.5 text-xs transition-all duration-300",
                                        isCommentLiked(comment) 
                                          ? 'text-rose-500 font-semibold' 
                                          : 'text-slate-500 hover:text-rose-500',
                                        !isSignedIn && 'opacity-50 cursor-not-allowed'
                                      )}
                                    >
                                      <ThumbsUp className={cn("w-4 h-4", isCommentLiked(comment) && "fill-current")} />
                                      <span>{comment.likes?.length || 0}</span>
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        setReplyToComment(comment._id);
                                        setReplyText(`@${comment.user.username} `);
                                        // FIXED: Use proper type assertion for focus
                                        const replyInput = document.querySelector(`[data-reply-input="${comment._id}"]`) as HTMLInputElement;
                                        setTimeout(() => replyInput?.focus(), 100);
                                      }}
                                      className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      <span>Reply</span>
                                    </button>
                                    
                                    <span className="text-xs text-slate-400">
                                      {getTimeAgo(comment.createdAt)}
                                    </span>
                                    
                                    {comment.replies && comment.replies.length > 0 && (
                                      <button
                                        onClick={() => setExpandedComment(
                                          expandedComment === comment._id ? null : comment._id
                                        )}
                                        className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1.5 ml-auto"
                                      >
                                        {expandedComment === comment._id ? (
                                          <>
                                            <ChevronUp className="w-3.5 h-3.5" />
                                            Hide {comment.replies.length} replies
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="w-3.5 h-3.5" />
                                            View {comment.replies.length} replies
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Reply Input */}
                              {replyToComment === comment._id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="ml-12 mt-2"
                                >
                                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/30 dark:bg-blue-900/10 border border-blue-200/30 dark:border-blue-800/30">
                                    <Avatar className="w-8 h-8">
                                      <AvatarImage src={currentUser?.imageUrl} />
                                      <AvatarFallback className="text-xs">
                                        {currentUser?.firstName?.[0] || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 relative">
                                      <Input
                                        data-reply-input={comment._id}
                                        placeholder="Write a reply..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddReply(comment._id);
                                          }
                                          if (e.key === 'Escape') {
                                            setReplyToComment(null);
                                            setReplyText('');
                                          }
                                        }}
                                        className="rounded-xl pr-24 bg-white/70 dark:bg-slate-700/70 border-blue-200/50 dark:border-blue-800/50 h-10"
                                      />
                                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setReplyToComment(null);
                                            setReplyText('');
                                          }}
                                          className="h-8 px-3 text-xs"
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => handleAddReply(comment._id)}
                                          disabled={!replyText.trim() || isReplying}
                                          className="h-8 px-3 text-xs bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                                        >
                                          {isReplying ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            'Reply'
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}

                              {/* Replies */}
                              {comment.replies && expandedComment === comment._id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="ml-12 mt-2 space-y-2"
                                >
                                  {comment.replies.map((reply) => (
                                    <div key={reply._id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                                      <Avatar className="w-8 h-8">
                                        <AvatarImage src={reply.user.avatar} />
                                        <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                          {reply.user.firstName[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-semibold text-xs">
                                            {reply.user.username}
                                          </span>
                                          {reply.user.isVerified && (
                                            <Verified className="w-3 h-3 text-blue-500" />
                                          )}
                                        </div>
                                        <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                                          {reply.text}
                                        </p>
                                        <div className="flex items-center gap-3">
                                          <button 
                                            onClick={() => handleLikeComment(reply._id)}
                                            className="text-xs text-slate-500 hover:text-rose-500 flex items-center gap-1"
                                          >
                                            <ThumbsUp className="w-3 h-3" />
                                            <span>{reply.likes?.length || 0}</span>
                                          </button>
                                          <span className="text-xs text-slate-400">
                                            {getTimeAgo(reply.createdAt)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <div className="relative mx-auto w-20 h-20 mb-4">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur-lg" />
                            <MessageCircle className="relative w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto" />
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium mb-2">
                            No comments yet
                          </p>
                          <p className="text-sm text-slate-400 dark:text-slate-500">
                            Be the first to share your thoughts!
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column - Trending & Related */}
            <div className="space-y-6">
              {/* Trending Hashtags Card */}
              <div className="rounded-3xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-rose-500" />
                    Trending Now
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLoadingTrends(true);
                      fetch('/api/hashtags/trending')
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) {
                            setTrendingHashtags(data.hashtags);
                          }
                        })
                        .finally(() => setLoadingTrends(false));
                    }}
                    disabled={loadingTrends}
                    className="w-8 h-8 p-0 rounded-full"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", loadingTrends && "animate-spin")} />
                  </Button>
                </div>
                
                {loadingTrends ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  </div>
                ) : trendingHashtags.length > 0 ? (
                  <div className="space-y-3">
                    {trendingHashtags.slice(0, 6).map((hashtag, index) => (
                      <motion.div
                        key={hashtag.tag}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all duration-300 cursor-pointer group"
                        onClick={() => router.push(`/explore?hashtag=${hashtag.tag}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-r",
                            getTrendColor(index)
                          )}>
                            {index < 3 ? <Flame className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="font-medium group-hover:text-rose-500 transition-colors">
                              #{hashtag.tag}
                            </div>
                            <div className="text-xs text-slate-500">
                              {hashtag.count.toLocaleString()} posts
                            </div>
                          </div>
                        </div>
                        {index < 3 && (
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-r",
                            getTrendColor(index)
                          )}>
                            {index + 1}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Hash className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No trending hashtags</p>
                  </div>
                )}
              </div>

              {/* Related Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="rounded-3xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 shadow-xl p-6">
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-emerald-500" />
                    Related Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                      <Badge 
                        key={index}
                        variant="secondary"
                        className="rounded-full bg-slate-100/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer transition-all duration-300 hover:scale-105"
                        onClick={() => router.push(`/explore?tag=${tag}`)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase Card */}
              {post.availableForSale && post.price && (
                <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-xl border border-emerald-200/30 dark:border-emerald-700/30 shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Premium Design</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">High-resolution files</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                      ${post.price}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Includes commercial license
                    </p>
                  </div>
                  <Button 
                    className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => {
                      toast({
                        title: "Purchase initiated",
                        description: "Redirecting to checkout...",
                      });
                    }}
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Purchase Now
                  </Button>
                </div>
              )}
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
          background: rgba(148, 163, 184, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #06b6d4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #0891b2);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(71, 85, 105, 0.1);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #60a5fa, #22d3ee);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #3b82f6, #06b6d4);
        }
      `}</style>
    </div>
  );
}

// Loading State Component
const LoadingState = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-rose-950/20 flex items-center justify-center">
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
        className="text-slate-600 dark:text-slate-400 text-lg"
      >
        Loading design...
      </motion.p>
    </motion.div>
  </div>
);

// Not Found State Component
const NotFoundState = ({ error }: { error?: string | null }) => {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-rose-950/20 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md mx-auto p-8"
      >
        <div className="rounded-3xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 shadow-2xl p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-10 h-10 text-rose-400" />
          </motion.div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Design Not Found
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error || "The design you're looking for doesn't exist or has been removed."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => router.back()}
              className="rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white"
            >
              Go Back
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/explore')}
              className="rounded-2xl border-white/30 dark:border-slate-700/30"
            >
              Explore Designs
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};