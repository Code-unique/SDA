// components/comments/comments-section.tsx
'use client'

import { useState, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { 
  Send, 
  Loader2, 
  Heart, 
  Reply, 
  Edit3, 
  Trash2, 
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Check,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

interface Comment {
  _id: string;
  text: string;
  user: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string;
    isVerified: boolean;
    isPro: boolean;
  };
  likes: string[];
  replies?: Comment[];
  parentComment?: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
}

interface CommentsSectionProps {
  postId: string;
  comments: Comment[];
  onAddComment: (text: string) => Promise<void>;
  onLikeComment: (commentId: string) => Promise<void>;
  onReply: (commentId: string, text: string) => Promise<void>;
  onEditComment: (commentId: string, text: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isLoading?: boolean;
  isAddingComment?: boolean;
  showComments?: boolean;
  onToggleComments?: () => void;
}

export function CommentsSection({
  postId,
  comments,
  onAddComment,
  onLikeComment,
  onReply,
  onEditComment,
  onDeleteComment,
  isLoading = false,
  isAddingComment = false,
  showComments = true,
  onToggleComments
}: CommentsSectionProps) {
  const { user, isSignedIn } = useUser()
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    await onAddComment(newComment)
    setNewComment('')
  }

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return
    await onReply(commentId, replyText)
    setReplyTo(null)
    setReplyText('')
  }

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) return
    await onEditComment(commentId, editText)
    setEditingComment(null)
    setEditText('')
  }

  const toggleExpand = (commentId: string) => {
    const newExpanded = new Set(expandedComments)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedComments(newExpanded)
  }

  const getReplies = (commentId: string): Comment[] => {
    return comments.filter(comment => comment.parentComment === commentId)
  }

  const renderComment = (comment: Comment, depth = 0) => {
    const replies = getReplies(comment._id)
    const isAuthor = comment.user._id === user?.id
    const isLiked = comment.likes.includes(user?.id || '')
    const isExpanded = expandedComments.has(comment._id)

    return (
      <div key={comment._id} className={cn("space-y-3", depth > 0 && "ml-8 pl-4 border-l")}>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/profile/${comment.user.username}`}>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={comment.user.avatar} />
                  <AvatarFallback>{comment.user.firstName[0]}</AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/profile/${comment.user.username}`}
                    className="font-semibold hover:underline"
                  >
                    {comment.user.username}
                  </Link>
                  {comment.isEdited && (
                    <span className="text-xs text-slate-500">(edited)</span>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === comment._id ? null : comment._id)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {activeMenu === comment._id && (
                <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg border z-10 w-32">
                  {isAuthor && (
                    <>
                      <button
                        onClick={() => {
                          setEditingComment(comment._id)
                          setEditText(comment.text)
                          setActiveMenu(null)
                        }}
                        className="w-full px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          onDeleteComment(comment._id)
                          setActiveMenu(null)
                        }}
                        className="w-full px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 text-left"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setReplyTo(comment._id)
                      setReplyText(`@${comment.user.username} `)
                      setActiveMenu(null)
                    }}
                    className="w-full px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-left"
                  >
                    Reply
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {editingComment === comment._id ? (
            <div className="mt-3 space-y-2">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleEdit(comment._id)}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingComment(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-slate-700 dark:text-slate-300">{comment.text}</p>
          )}
          
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => onLikeComment(comment._id)}
              disabled={!isSignedIn}
              className={cn(
                "flex items-center gap-1",
                isLiked && "text-rose-500"
              )}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              <span className="text-sm">{comment.likes.length}</span>
            </button>
            
            <button
              onClick={() => {
                setReplyTo(comment._id)
                setReplyText(`@${comment.user.username} `)
              }}
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
            
            {replies.length > 0 && (
              <button
                onClick={() => toggleExpand(comment._id)}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide {replies.length} replies
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    View {replies.length} replies
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        
        {/* Reply Input */}
        {replyTo === comment._id && (
          <div className="ml-8">
            <div className="flex gap-2">
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleReply(comment._id)
                  }
                }}
              />
              <Button onClick={() => handleReply(comment._id)}>Reply</Button>
              <Button variant="ghost" onClick={() => setReplyTo(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Replies */}
        {isExpanded && replies.length > 0 && (
          <div className="space-y-3">
            {replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Comment Input */}
      <div className="flex gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAddComment()
              }
            }}
            disabled={!isSignedIn || isAddingComment}
          />
          <div className="flex justify-between items-center mt-2">
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim() || !isSignedIn || isAddingComment}
            >
              {isAddingComment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Comment
                </>
              )}
            </Button>
            {!isSignedIn && (
              <p className="text-sm text-slate-500">Sign in to comment</p>
            )}
          </div>
        </div>
      </div>

      {/* Comments List */}
      {showComments && (
        <div className="space-y-4">
          {comments.filter(comment => !comment.parentComment).map(comment => 
            renderComment(comment)
          )}
          
          {comments.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>No comments yet. Be the first to comment!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}