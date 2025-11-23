// types/index.ts
export interface User {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar?: string
  email: string
  followers?: string[] | { _id: string }[]
  following?: string[] | { _id: string }[]
  isVerified?: boolean
  isPro?: boolean
  badges?: string[]
  skills?: string[]
  interests?: string[]
  createdAt: string
  updatedAt: string
}

export interface Media {
  _id?: string
  url: string
  type: 'image' | 'video'
  thumbnail?: string
  alt?: string
  publicId?: string
}

export interface Comment {
  _id: string
  user: User
  text: string
  likes: string[]
  createdAt: string
  isEdited?: boolean
}

export interface LikeEntry {
  _id?: string
  id?: string
}

export interface Post {
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
  style?: {
    colors: string[]
    style: string[]
    materials: string[]
  }
}

export interface FeaturedPost extends Omit<Post, 'media'> {
  media: {
    url: string
    type?: string
  }[]
}