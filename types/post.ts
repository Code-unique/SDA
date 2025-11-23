export interface User {
  _id: string
  clerkId: string
  username: string
  firstName: string
  lastName: string
  avatar: string
  email: string
  isVerified?: boolean
  isPro?: boolean
  followers?: string[] | User[]
  following?: string[] | User[]
  role?: 'user' | 'designer' | 'admin'
  badges?: string[]
  bio?: string
  location?: string
  website?: string
  createdAt: string
  updatedAt: string
}

export interface Media {
  type: 'image' | 'video' | 'gif'
  url: string
  thumbnail?: string
  publicId?: string
  duration?: number
  alt?: string
  width?: number
  height?: number
}

export interface Comment {
  _id: string
  user: User
  text: string
  likes?: string[]
  replies?: Comment[]
  createdAt: string
  updatedAt?: string
  isEdited?: boolean
}

export interface Post {
  _id: string
  author: User
  media: Media[]
  caption: string
  hashtags?: string[]
  mentions?: string[]
  likes?: string[]
  comments?: Comment[]
  saves?: string[]
  shares?: number
  views?: number
  engagement?: number
  location?: string
  tags?: string[]
  category?: string
  isPublic?: boolean
  isSponsored?: boolean
  isFeatured?: boolean
  isEdited?: boolean
  createdAt: string
  updatedAt?: string
  price?: number
  currency?: string
  availableForSale?: boolean
  aiGenerated?: boolean
  collaboration?: boolean
  challenge?: {
    name: string
    id: string
  }
  music?: {
    title: string
    artist: string
    url: string
  }
  style?: {
    colors: string[]
    style: string[]
    materials: string[]
  }
}

export interface PostCardProps {
  post: Post
  onLike?: (postId: string) => Promise<void>
  onSave?: (postId: string) => Promise<void>
  onShare?: (postId: string) => Promise<void>
  onComment?: (postId: string, text: string) => Promise<void>
  onFollow?: (userId: string) => Promise<void>
  onReport?: (postId: string, reason: string) => Promise<void>
  onEdit?: (postId: string) => Promise<void>
  onDelete?: (postId: string) => Promise<void>
  onPurchase?: (postId: string) => Promise<void>
  onVote?: (postId: string, option: number) => Promise<void>
  onMention?: (username: string) => void
  onHashtagClick?: (hashtag: string) => void
  currentUserId?: string
  showEngagement?: boolean
  compact?: boolean
  featured?: boolean
  viewMode?: 'grid' | 'list'
  className?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    currentPage: number
    totalPages: number
    totalItems: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface FeaturedPost {
  _id: string;
  author: {
    _id: string;          // ✅ Required
    firstName: string;
    lastName: string;
    username: string;
    media:Media
    avatar: string;
  };
}
