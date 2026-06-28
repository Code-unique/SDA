// app/posts/[id]/page.tsx - UPDATED COMPLETE VERSION
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
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
  MoreHorizontal,
  Send,
  ThumbsUp,
  Trash2,
  Edit,
  Flag,
  Copy,
  Check,
  TrendingUp,
  RefreshCw,
  Hash,
  Flame,
  Clock,
  ShoppingBag,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Hash as HashIcon,
  Reply,
  Edit3,
  X,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Textarea } from '@/components/ui/textarea'

// Import updated interfaces
import { Post, User, Comment, BatchStatuses, TrendingHashtag } from '@/types/post'

interface CommentWithNesting extends Comment {
  replies?: CommentWithNesting[];
  parentComment?: string;
  isReplying?: boolean;
  isEditing?: boolean;
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
  const [isFollowLoading, setIsFollowLoading] = useState(false);
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
  const [showComments, setShowComments] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [activeCommentMenu, setActiveCommentMenu] = useState<string | null>(null);
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showEditPostModal, setShowEditPostModal] = useState(false);
  const [editPostData, setEditPostData] = useState({
    caption: '',
    hashtags: ''
  });
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
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
  const editCommentRef = useRef<HTMLTextAreaElement>(null);
  
  // Scroll animations
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [0, 1]);
  const headerScale = useTransform(scrollY, [0, 100], [0.95, 1]);

  const currentUserId = currentUser?.id || '';

  // Video control functions
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

  const handleVideoLoaded = () => {
    setIsVideoLoaded(true);
    setVideoDuration(videoRef.current?.duration || 0);
  };

  const showVideoControlsTemporary = () => {
    setShowVideoControls(true);
    setTimeout(() => {
      setShowVideoControls(false);
    }, 3000);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch post data with proper error handling
  const fetchPost = useCallback(async () => {
    if (!postId || !userLoaded) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/posts/${postId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const postData = data.data;
        
        // Ensure comments array exists and has proper structure
        const processedPost = {
          ...postData,
          comments: Array.isArray(postData.comments) ? postData.comments.map((comment: any) => ({
            ...comment,
            user: typeof comment.user === 'string' ? { _id: comment.user } : comment.user,
            replies: comment.replies || [],
            likes: comment.likes || []
          })) : [],
          author: typeof postData.author === 'string' ? { _id: postData.author } : postData.author,
          media: postData.media || [],
          hashtags: postData.hashtags || [],
          likes: postData.likes || [],
          saves: postData.saves || []
        };
        
        setPost(processedPost);
        
        // Set edit data
        setEditPostData({
          caption: processedPost.caption,
          hashtags: Array.isArray(processedPost.hashtags) ? processedPost.hashtags.join(' ') : ''
        });
        
        // Fetch statuses if signed in
        if (isSignedIn && processedPost._id) {
          try {
            const statusResponse = await fetch('/api/batch-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                postIds: [processedPost._id],
                userIds: processedPost.author?._id ? [processedPost.author._id] : []
              })
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData?.success && statusData.data) {
                setStatuses(statusData.data);
                setIsSaved(!!statusData.data.saveStatuses?.[processedPost._id]?.saved);
                if (processedPost.author?._id) {
                  setIsFollowing(!!statusData.data.followStatuses?.[processedPost.author._id]);
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
    } catch (error: any) {
      console.error('Error fetching post:', error);
      setError(error.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [postId, userLoaded, isSignedIn]);

  // Load post on mount
  useEffect(() => {
    if (postId && userLoaded) {
      fetchPost();
    }
  }, [postId, userLoaded, fetchPost]);

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

  // Handle like with proper typing
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

    const wasLiked = statuses.likeStatuses[post._id] || false;

    // Optimistic update
    setPost(prev => {
      if (!prev) return null;
      
      const currentLikes = Array.isArray(prev.likes) ? prev.likes : [];
      const isUserInLikes = currentLikes.some(like => 
        typeof like === 'string' ? like === currentUserId : (like as User)._id === currentUserId
      );
      
      return {
        ...prev,
        likes: wasLiked 
          ? currentLikes.filter(like => 
              typeof like === 'string' ? like !== currentUserId : (like as User)._id !== currentUserId
            )
          : [...currentLikes, currentUserId]
      };
    });

    setStatuses(prev => ({
      ...prev,
      likeStatuses: { ...prev.likeStatuses, [post._id]: !wasLiked }
    }));

    setIsLiking(true);

    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
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

    const wasSaved = statuses.saveStatuses[post._id]?.saved || false;

    // Optimistic update
    setIsSaved(!wasSaved);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/posts/${postId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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
    if (!post?.author || isFollowLoading) return;

    const authorId = typeof post.author === 'string' ? post.author : post.author._id;
    if (!authorId) return;

    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to follow users",
        variant: "destructive"
      });
      return;
    }

    const previousIsFollowing = isFollowing;

    // Optimistic update
    setIsFollowing(!previousIsFollowing);
    setIsFollowLoading(true);

    try {
      const response = await fetch(`/api/users/${authorId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error("Follow request failed");
      }

      const result = await response.json();
      
      if (result.success) {
        setStatuses(prev => ({
          ...prev,
          followStatuses: { ...prev.followStatuses, [authorId]: !previousIsFollowing }
        }));

        toast({
          title: !previousIsFollowing ? "Following" : "Unfollowed",
          description: !previousIsFollowing
            ? `You are now following ${typeof post.author !== 'string' ? post.author.firstName : 'User'}`
            : `You unfollowed ${typeof post.author !== 'string' ? post.author.firstName : 'User'}`,
        });
      } else {
        throw new Error(result.error || "Follow request failed");
      }
    } catch (error: any) {
      setIsFollowing(previousIsFollowing);
      
      toast({
        title: "Error",
        description: error.message || "Failed to follow user",
        variant: "destructive"
      });
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Handle comment submission
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
    
    // Create temp comment with proper structure
    const tempComment: CommentWithNesting = {
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
      } as User,
      text: originalCommentText,
      post: postId,
      likes: [],
      replies: [],
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
          // Rollback on error
          setPost(prev => prev ? {
            ...prev,
            comments: prev.comments?.filter(c => c._id !== tempCommentId) || []
          } : null);
          setCommentText(originalCommentText);
        }
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (error) {
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

  // Handle reply to comment
  const handleAddReply = async (commentId: string, parentCommentId?: string) => {
  if (!replyText.trim() || isReplying) return;

  const tempReplyId = `temp-reply-${Date.now()}`;
  const originalReplyText = replyText.trim();
  const parentId = parentCommentId || commentId;

  // Create temp reply
  const tempReply: CommentWithNesting = {
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
    } as User,
    text: originalReplyText,
    post: postId,
    likes: [],
    replies: [],
    parentComment: parentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Optimistic update - Add as a new comment
  setPost(prev => {
    if (!prev) return null;
    return {
      ...prev,
      comments: [...(prev.comments || []), tempReply]
    };
  });

  setReplyText('');
  setIsReplying(true);
  setReplyToComment(null);

  try {
    const response = await fetch(`/api/posts/${postId}/comments/${parentId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: originalReplyText
      }),
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
        // Rollback on error
        setPost(prev => {
          if (!prev) return null;
          return {
            ...prev,
            comments: prev.comments?.filter(c => c._id !== tempReplyId) || []
          };
        });
        setReplyText(originalReplyText);
      }
    } else {
      throw new Error('Failed to add reply');
    }
  } catch (error) {
    setPost(prev => {
      if (!prev) return null;
      return {
        ...prev,
        comments: prev.comments?.filter(c => c._id !== tempReplyId) || []
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


  // Handle comment like
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
        headers: { 'Content-Type': 'application/json' }
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
      } else {
        throw new Error('Failed to like comment');
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast({
        title: "Error",
        description: "Failed to like comment",
        variant: "destructive"
      });
    }
  };

  // Handle edit comment
  const handleEditComment = async (commentId: string) => {
    if (!editCommentText.trim() || isEditing) return;

    setIsEditing(true);

    try {
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editCommentText.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPost(data.data);
          setEditingComment(null);
          setEditCommentText('');
          toast({
            title: "Comment updated",
            description: "Your comment has been updated"
          });
        }
      } else {
        throw new Error('Failed to edit comment');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      toast({
        title: "Error",
        description: "Failed to edit comment",
        variant: "destructive"
      });
    } finally {
      setIsEditing(false);
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!isSignedIn) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to delete comments",
        variant: "destructive"
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this comment?')) return;

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
      } else {
        throw new Error('Failed to delete comment');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive"
      });
    }
  };

  // Handle edit post
  const handleEditPost = async () => {
    if (!editPostData.caption.trim()) return;

    try {
      const response = await fetch(`/api/posts/${postId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: editPostData.caption,
          hashtags: editPostData.hashtags.split(' ').filter(tag => tag.trim() !== '')
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPost(data.data);
          setShowEditPostModal(false);
          toast({
            title: "Post updated",
            description: "Your post has been updated successfully"
          });
        }
      } else {
        throw new Error('Failed to update post');
      }
    } catch (error) {
      console.error('Error editing post:', error);
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive"
      });
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
          text: `Check out this design by ${typeof post?.author !== 'string' ? post?.author.firstName : 'User'}`,
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
      } else {
        throw new Error('Failed to delete post');
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
  const isLiked = statuses.likeStatuses[post?._id || ''] || false;
  const isCommentAuthor = (commentUserId: string) => commentUserId === currentUserId;
  const isCommentLiked = (comment: Comment) => {
    if (!comment.likes || !Array.isArray(comment.likes)) return false;
    return comment.likes.some(like => 
      typeof like === 'string' ? like === currentUserId : (like as User)._id === currentUserId
    );
  };
  
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
  const formatNumber = (num?: number): string => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Get comment replies
  const getCommentReplies = (commentId: string): CommentWithNesting[] => {
  if (!post || !post.comments) return [];
  return post.comments.filter(comment => 
    comment.parentComment === commentId
  ) as CommentWithNesting[];
};

  // Toggle expanded comments
  const toggleExpandComment = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  // Get comment count
  const getCommentCount = (): number => {
    if (!post || !post.comments) return 0;
    return Array.isArray(post.comments) ? post.comments.length : 0;
  };

  // Get likes count
  const getLikesCount = (): number => {
    if (!post || !post.likes) return 0;
    return Array.isArray(post.likes) ? post.likes.length : 0;
  };

  // Get saves count
  const getSavesCount = (): number => {
    if (!post || !post.saves) return 0;
    return Array.isArray(post.saves) ? post.saves.length : 0;
  };

  // Get author username
  const getAuthorUsername = (): string => {
    if (!post?.author) return 'Unknown';
    return typeof post.author === 'string' ? 'Unknown' : post.author.username || 'Unknown';
  };

  // Get author name
  const getAuthorName = (): string => {
    if (!post?.author) return 'Unknown User';
    if (typeof post.author === 'string') return 'Unknown User';
    return `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || post.author.username || 'Unknown User';
  };

  // Get author avatar
  const getAuthorAvatar = (): string | undefined => {
  if (!post?.author) return undefined;
  return typeof post.author === 'string' ? undefined : 
    (post.author.avatar && post.author.avatar.trim() !== '' ? post.author.avatar : undefined);
};

  // Get author verification status
  const getAuthorVerified = (): boolean => {
    if (!post?.author) return false;
    return typeof post.author === 'string' ? false : post.author.isVerified || false;
  };

  // Get author pro status
  const getAuthorPro = (): boolean => {
    if (!post?.author) return false;
    return typeof post.author === 'string' ? false : post.author.isPro || false;
  };

  // Render comment with replies
  const renderComment = (comment: CommentWithNesting, depth = 0) => {
  const replies = getCommentReplies(comment._id);
  const isAuthor = isCommentAuthor(typeof comment.user === 'string' ? comment.user : (comment.user?._id || ''));
  const isLiked = isCommentLiked(comment);
  const isExpanded = expandedComments.has(comment._id);
  const isEditingThis = editingComment === comment._id;
  
  // Safely get comment user data
  const commentUser = (() => {
    // If user is a string ID
    if (typeof comment.user === 'string') {
      return {
        _id: comment.user,
        username: 'User',
        avatar: '',
        firstName: 'User',
        lastName: '',
        isVerified: false,
        isPro: false,
        followers: [],
        following: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as User;
    }
    
    // If user is populated object
    if (comment.user && typeof comment.user === 'object') {
      return {
        _id: comment.user._id || '',
        username: comment.user.username || 'User',
        avatar: comment.user.avatar && comment.user.avatar.trim() !== '' 
          ? comment.user.avatar 
          : undefined,
        firstName: comment.user.firstName || 'User',
        lastName: comment.user.lastName || '',
        isVerified: comment.user.isVerified || false,
        isPro: comment.user.isPro || false,
        followers: [],
        following: [],
        createdAt: comment.user.createdAt || new Date().toISOString(),
        updatedAt: comment.user.updatedAt || new Date().toISOString()
      } as User;
    }
    
    // Fallback
    return {
      _id: '',
      username: 'User',
      avatar: '',
      firstName: 'User',
      lastName: '',
      isVerified: false,
      isPro: false,
      followers: [],
      following: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as User;
  })();

  return (
    <div key={comment._id} className={cn("space-y-2", depth > 0 && "ml-8 pl-4 border-l border-slate-200 dark:border-slate-700")}>
      {/* Comment Card */}
      <div className={cn(
        "p-4 rounded-xl transition-all duration-300",
        isExpanded 
          ? "bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30" 
          : "bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
      )}>
        <div className="flex items-start gap-3">
          {/* User Avatar */}
          <Link href={`/profile/${commentUser.username}`} className="flex-shrink-0">
            <Avatar className="w-8 h-8 ring-2 ring-white/50 dark:ring-slate-700/50">
              <AvatarImage src={commentUser.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs font-semibold">
                {commentUser.firstName?.[0] || commentUser.username?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Link 
                  href={`/profile/${commentUser.username}`}
                  className="font-semibold text-sm text-slate-900 dark:text-white hover:text-blue-600 transition-colors"
                >
                  {commentUser.username}
                </Link>
                {commentUser.isVerified && (
                  <Verified className="w-3.5 h-3.5 text-blue-500" />
                )}
                {commentUser.isPro && (
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="text-xs text-slate-500">
                  {getTimeAgo(comment.createdAt)}
                </span>
                {comment.isEdited && (
                  <span className="text-xs text-slate-500 italic">(edited)</span>
                )}
              </div>
              
              {/* Comment Menu */}
              <div className="relative">
                <button
                  onClick={() => setActiveCommentMenu(
                    activeCommentMenu === comment._id ? null : comment._id
                  )}
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-slate-500" />
                </button>
                
                <AnimatePresence>
                  {activeCommentMenu === comment._id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 top-8 z-50 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 py-1"
                    >
                      <button
                        onClick={() => {
                          setReplyToComment(comment._id);
                          setReplyText(`@${commentUser.username} `);
                          setActiveCommentMenu(null);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>
                      
                      <button 
                        onClick={() => handleLikeComment(comment._id)}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Heart className={cn("w-3.5 h-3.5", isLiked ? "text-rose-500 fill-current" : "text-rose-500")} />
                        <span>{isLiked ? 'Unlike' : 'Like'}</span>
                      </button>
                      
                      {isAuthor && (
                        <>
                          <button 
                            onClick={() => {
                              setEditingComment(comment._id);
                              setEditCommentText(comment.text);
                              setActiveCommentMenu(null);
                              setTimeout(() => editCommentRef.current?.focus(), 100);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          
                          <button 
                            onClick={() => {
                              setActiveCommentMenu(null);
                              handleDeleteComment(comment._id);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Comment Text (Editable) */}
            {isEditingThis ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  ref={editCommentRef}
                  value={editCommentText}
                  onChange={(e) => setEditCommentText(e.target.value)}
                  className="min-h-[80px] text-sm"
                  placeholder="Edit your comment..."
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditComment(comment._id)}
                    disabled={isEditing || !editCommentText.trim()}
                    className="h-8"
                  >
                    {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingComment(null);
                      setEditCommentText('');
                    }}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-slate-800 dark:text-slate-200 text-sm mt-1 leading-relaxed">
                {comment.text}
              </p>
            )}
            
            {/* Comment Actions */}
            <div className="flex items-center gap-4 mt-3">
              <button 
                onClick={() => handleLikeComment(comment._id)}
                disabled={!isSignedIn}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-all duration-300",
                  isLiked ? 'text-rose-500 font-semibold' : 'text-slate-500 hover:text-rose-500',
                  !isSignedIn && 'opacity-50 cursor-not-allowed'
                )}
              >
                <ThumbsUp className={cn("w-4 h-4", isLiked && "fill-current")} />
                <span>{Array.isArray(comment.likes) ? comment.likes.length : 0}</span>
              </button>
              
              <button
                onClick={() => {
                  setReplyToComment(comment._id);
                  setReplyText(`@${commentUser.username} `);
                }}
                className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
              
              {replies.length > 0 && (
                <button
                  onClick={() => toggleExpandComment(comment._id)}
                  className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1.5 ml-auto"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Hide {replies.length} replies
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      View {replies.length} replies
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
            className="mt-3 ml-10"
          >
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={currentUser?.imageUrl} />
                <AvatarFallback className="text-xs">
                  {currentUser?.firstName?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Input
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
                  placeholder="Write a reply..."
                  className="text-sm h-9"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplyToComment(null);
                      setReplyText('');
                    }}
                    className="h-6 px-2 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAddReply(comment._id)}
                    disabled={!replyText.trim() || isReplying}
                    className="h-6 px-2 text-xs"
                  >
                    {isReplying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reply'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Replies */}
      {isExpanded && replies.length > 0 && (
        <div className="space-y-2">
          {replies.map(reply => renderComment(reply, depth + 1))}
        </div>
      )}
    </div>
  );
};

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

  const currentMedia = post.media?.[currentMediaIndex];
  const commentCount = getCommentCount();

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
                <span className="text-sm font-medium">{formatNumber(getLikesCount())}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-sm font-medium">{formatNumber(commentCount)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bookmark className={cn("w-3.5 h-3.5", isSaved ? "text-amber-500 fill-current" : "text-slate-500")} />
                <span className="text-sm font-medium">{formatNumber(getSavesCount())}</span>
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
                    {currentUserId === (typeof post.author !== 'string' ? post.author?.clerkId : '') ? (
                      <>
                        <button 
                          onClick={() => {
                            setShowEditPostModal(true);
                            setShowOptionsMenu(false);
                          }}
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
            {/* Left Column - Media & Comments */}
            <div className="lg:col-span-2 space-y-6">
              {/* Glass Morphic Media Container */}
              <div 
                ref={mediaContainerRef}
                className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-100/50 to-slate-200/50 dark:from-slate-800/50 dark:to-slate-900/50 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 shadow-2xl mb-6"
                onMouseEnter={() => {
                  setIsHovered(true);
                  showVideoControlsTemporary();
                }}
                onMouseLeave={() => setIsHovered(false)}
                onMouseMove={showVideoControlsTemporary}
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
                          onLoadedData={handleVideoLoaded}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onEnded={() => setIsPlaying(false)}
                          className="w-full h-auto max-h-[75vh] object-contain"
                          playsInline
                          preload="metadata"
                        />
                        
                        {/* Video Controls */}
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent transition-all duration-300",
                          (showVideoControls || isHovered) ? "opacity-100" : "opacity-0"
                        )}>
                          {/* Top progress bar */}
                          <div className="absolute top-4 left-4 right-4">
                            <div className="w-full bg-white/20 backdrop-blur-lg rounded-full h-1.5 mb-1">
                              <div 
                                className="bg-gradient-to-r from-rose-500 to-pink-500 h-1.5 rounded-full transition-all duration-100"
                                style={{ width: `${videoProgress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-white text-xs">
                              <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
                              <span>{formatTime(videoDuration)}</span>
                            </div>
                          </div>
                          
                          {/* Center play button when paused */}
                          {!isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={togglePlay}
                                className="w-20 h-20 bg-black/60 backdrop-blur-lg text-white rounded-full hover:bg-black/80 hover:scale-110 transition-all"
                              >
                                <Play className="w-8 h-8 ml-1" />
                              </Button>
                            </div>
                          )}

                          {/* Bottom controls */}
                          <div className="absolute bottom-6 left-6 right-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={togglePlay}
                                  className="w-12 h-12 bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 hover:scale-110 transition-all"
                                >
                                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={toggleMute}
                                  className="w-12 h-12 bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 hover:scale-110 transition-all"
                                >
                                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </Button>
                                <div className="text-white text-sm font-medium ml-2">
                                  {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(videoDuration)}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={toggleFullscreen}
                                  className="w-12 h-12 bg-white/20 backdrop-blur-lg text-white hover:bg-white/30 hover:scale-110 transition-all"
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
                {post.media && post.media.length > 1 && (
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

              {/* Author & Actions Card */}
              <div className="rounded-3xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 shadow-xl mb-6 overflow-hidden">
                <div className="p-6">
                  {/* Author */}
                  <div className="flex items-center justify-between mb-4">
                    <Link 
                      href={`/profile/${getAuthorUsername()}`} 
                      className="flex items-center gap-3 group/author"
                    >
                      <div className="relative">
                        <Avatar className="w-12 h-12 border-2 border-white/80 dark:border-slate-700/80">
                          <AvatarImage src={getAuthorAvatar()} />
                          <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-500 text-white font-semibold">
                            {getAuthorName()[0]}
                          </AvatarFallback>
                        </Avatar>
                        {getAuthorVerified() && (
                          <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full p-1 border-2 border-white/80 dark:border-slate-700/80">
                            <Verified className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white group-hover/author:text-rose-600 transition-colors">
                            {getAuthorName()}
                          </p>
                          {getAuthorPro() && (
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          @{getAuthorUsername()}
                        </p>
                      </div>
                    </Link>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFollow}
                      disabled={!isSignedIn || isFollowLoading}
                      className={cn(
                        "rounded-full px-4 py-2 backdrop-blur-sm",
                        isFollowing 
                          ? "bg-slate-100/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600" 
                          : "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 border-0"
                      )}
                    >
                      {isFollowLoading ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : isFollowing ? (
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
                    
                    {/* Hashtags */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {post.hashtags.map((tag, index) => (
                          <Link 
                            key={index}
                            href={`/explore?hashtag=${tag}`}
                            className="text-blue-500 hover:text-blue-600 text-sm"
                          >
                            #{tag}
                          </Link>
                        ))}
                      </div>
                    )}
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
                        <span className="font-semibold">{formatNumber(getLikesCount())}</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowComments(true);
                          setTimeout(() => commentInputRef.current?.focus(), 100);
                        }}
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
                        <span className="font-semibold">{formatNumber(getSavesCount())}</span>
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

              {/* Comments Section */}
              <AnimatePresence>
                {showComments && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="rounded-3xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 shadow-xl overflow-hidden"
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

                      {/* Add Comment */}
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
                      className="max-h-[600px] overflow-y-auto custom-scrollbar p-4"
                    >
                      {post.comments && post.comments.length > 0 ? (
                        <div className="space-y-2">
                          {post.comments
                            .filter(comment => !comment.parentComment)
                            .map(comment => renderComment(comment as CommentWithNesting))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
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
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="rounded-3xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/30 dark:border-slate-700/30 shadow-xl p-6">
                  <h4 className="font-bold text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <HashIcon className="w-5 h-5 text-emerald-500" />
                    Related Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {post.hashtags.map((tag, index) => (
                      <Badge 
                        key={index}
                        variant="secondary"
                        className="rounded-full bg-slate-100/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer transition-all duration-300 hover:scale-105"
                        onClick={() => router.push(`/explore?tag=${tag}`)}
                      >
                        #{tag}
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

      {/* Edit Post Modal */}
      <AnimatePresence>
        {showEditPostModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditPostModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Edit Post</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEditPostModal(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Caption</label>
                  <Textarea
                    value={editPostData.caption}
                    onChange={(e) => setEditPostData(prev => ({ ...prev, caption: e.target.value }))}
                    className="min-h-[100px]"
                    maxLength={2200}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Hashtags</label>
                  <Input
                    value={editPostData.hashtags}
                    onChange={(e) => setEditPostData(prev => ({ ...prev, hashtags: e.target.value }))}
                    placeholder="#fashion #design #art"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Separate tags with spaces
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleEditPost}
                    className="flex-1"
                  >
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowEditPostModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <AlertCircle className="w-10 h-10 text-rose-400" />
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