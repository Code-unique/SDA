// components/FeaturedPostCard.tsx
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Heart, MessageCircle, Calendar } from 'lucide-react'
import { FeaturedPost } from '@/types'

interface PostAuthor {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar: string
}

interface PostComment {
  _id: string
  user: PostAuthor
  text: string
  createdAt: string
}

interface Post {
  _id: string
  author: PostAuthor
  media: Array<{
    type: 'image' | 'video'
    url: string
    thumbnail?: string
  }>
  caption: string
  hashtags: string[]
  likes: string[]
  comments: PostComment[]
  createdAt: string
}

interface FeaturedPostCardProps {
  post: Post | FeaturedPost
  index: number
}

export default function FeaturedPostCard({ post, index }: FeaturedPostCardProps) {
  // Ensure all data is properly formatted
  const author = post.author || {}
  const caption = post.caption || ''
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags : []
  const likes = Array.isArray(post.likes) ? post.likes : []
  const comments = Array.isArray(post.comments) ? post.comments : []
  const media = Array.isArray(post.media) ? post.media : []

  return (
    <Card className="rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
      {/* Post Image */}
      <div className="aspect-square bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
        {media[0]?.url ? (
          <img
            src={media[0].url}
            alt={caption}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20">
            <span className="text-slate-400 text-sm">No Image</span>
          </div>
        )}
        <div className="absolute top-4 left-4">
          <Badge className="rounded-full bg-white/90 backdrop-blur-sm text-slate-900 border-0">
            #{index + 1}
          </Badge>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Author Info */}
        <div className="flex items-center space-x-3 mb-4">
          <img
            src={author.avatar || '/default-avatar.png'}
            alt={author.username}
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {author.firstName} {author.lastName}
            </p>
            <p className="text-slate-500 text-xs truncate">@{author.username}</p>
          </div>
        </div>

        {/* Caption - Ensure it's a string */}
        <p className="text-slate-700 dark:text-slate-300 mb-4 line-clamp-2 text-sm">
          {typeof caption === 'string' ? caption : 'No caption available'}
        </p>

        {/* Hashtags - Ensure they're strings */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {hashtags.slice(0, 3).map((tag, tagIndex) => (
              <span 
                key={tagIndex} 
                className="text-xs text-blue-600 dark:text-blue-400"
              >
                #{typeof tag === 'string' ? tag : 'tag'}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Heart className="w-3 h-3" />
              <span>{likes.length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-3 h-3" />
              <span>{comments.length}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* View Post Link */}
        <Link 
          href={`/posts/${post._id}`}
          className="block mt-4 text-center text-sm text-rose-600 hover:text-rose-700 font-medium"
        >
          View Design
        </Link>
      </CardContent>
    </Card>
  )
}