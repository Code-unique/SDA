// types/post.ts
import { Types } from 'mongoose'

// Base response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// User interface - updated with optional fields
export interface User {
  _id: string;
  clerkId?: string;
  username: string;
  email?: string;
  firstName: string;
  lastName: string;
  avatar?: string; // Made optional
  bio?: string;
  location?: string;
  website?: string;
  isVerified: boolean;
  isPro: boolean;
  followers: string[] | User[];
  following: string[] | User[];
  badges?: string[];
  createdAt: string;
  updatedAt: string;
}

// Media interface - updated to match API response
export interface Media {
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnail?: string;
  publicId?: string; // Made optional to match API
  alt?: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  mimetype?: string;
  order?: number; // Made optional
}

// Comment interface
export interface Comment {
  _id: string;
  text: string;
  user: User | string;
  post?: string;
  likes: Array<string | User>;
  replies?: string[] | Comment[];
  parentComment?: string;
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
}

// Post interface
export interface Post {
  _id: string;
  author: User | string;
  media: Media[];
  caption: string;
  title?: string;
  content?: string;
  hashtags: string[];
  mentions?: string[];
  likes: Array<string | User>;
  comments: Comment[];
  saves: Array<string | User>;
  shares: number;
  views: number;
  engagement: number;
  location?: string;
  tags?: string[];
  category?: string;
  style?: {
    colors: string[];
    style: string[];
    materials: string[];
  };
  isPublic: boolean;
  isSponsored: boolean;
  isFeatured: boolean;
  isEdited: boolean;
  isArchived: boolean;
  aiGenerated: boolean;
  collaboration: boolean;
  availableForSale: boolean;
  price?: number;
  currency?: string;
  challenge?: {
    name: string;
    id: string;
  };
  music?: {
    title: string;
    artist: string;
    url: string;
  };
  
  // Media metadata
  mediaCount?: number;
  totalDuration?: number;
  containsVideo?: boolean;
  
  // Virtuals
  commentCount?: number;
  likesCount?: number;
  savesCount?: number;
  hasMultipleMedia?: boolean;
  hasVideo?: boolean;
  
  createdAt: string;
  updatedAt: string;
}

// Media upload constraints
export interface MediaConstraints {
  maxPhotos: number;
  maxVideos: number;
  maxTotalItems: number;
  maxVideoDuration: number;
  maxFileSize: number;
  allowedImageTypes: string[];
  allowedVideoTypes: string[];
}

// Trending hashtag interface
export interface TrendingHashtag {
  tag: string;
  count: number;
  trendScore?: number;
  lastUsed?: string;
}

// Batch statuses for likes, saves, follows
export interface BatchStatuses {
  likeStatuses: Record<string, boolean>;
  saveStatuses: Record<string, { saved: boolean; savedAt?: string }>;
  followStatuses: Record<string, boolean>;
}