// types/post.ts

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

// User interface
export interface User {
  _id: string;
  clerkId?: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string;
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

// Media interface
export interface Media {
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnail?: string;
  publicId?: string;
  duration?: number;
  alt?: string;
  width?: number;
  height?: number;
  size?: number;
  mimetype?: string;
  order?: number;
}

// Comment interface
export interface Comment {
  _id: string;
  text: string;
  user: User;
  post: string;
  likes: string[];
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
}

// Post interface
export interface Post {
  _id: string;
  author: User;
  media: Media[];
  caption: string;
  title?: string;
  content?: string;
  hashtags?: string[];
  mentions?: string[];
  likes?: string[];
  comments?: Comment[];
  saves?: string[];
  shares?: number;
  views?: number;
  engagement?: number;
  location?: string;
  tags?: string[];
  category?: string;
  isPublic?: boolean;
  isSponsored?: boolean;
  isFeatured?: boolean;
  isEdited?: boolean;
  createdAt: string;
  updatedAt?: string;
  
  // Media constraints
  mediaCount?: number;
  totalDuration?: number;
  containsVideo?: boolean;
  
  // Monetization
  price?: number;
  currency?: string;
  availableForSale?: boolean;
  
  // AI / metadata
  aiGenerated?: boolean;
  collaboration?: boolean;
  
  challenge?: {
    name: string;
    id: string;
  };
  
  music?: {
    title: string;
    artist: string;
    url: string;
  };
  
  style?: {
    colors: string[];
    style: string[];
    materials: string[];
  };
}

// Media upload constraints
export interface MediaConstraints {
  maxPhotos: number;
  maxVideos: number;
  maxTotalItems: number;
  maxVideoDuration: number; // in seconds
  maxFileSize: number; // in bytes
  allowedImageTypes: string[];
  allowedVideoTypes: string[];
}