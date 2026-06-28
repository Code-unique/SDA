// types/course.ts - UPDATED WITH LESSON AND SUBLESSON VIDEOS
export interface S3Asset {
  key: string
  url: string
  size: number
  type: 'image' | 'video'
  duration?: number
  width?: number
  height?: number
  fileName?: string
  originalFileName?: string
}

export interface VideoSource {
  type: 'uploaded' | 'library'
  video: S3Asset
  uploadedAt?: string
  uploadedBy?: string
}

export interface UploadProgress {
  [key: string]: {
    progress: number
    fileName: string
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo' | 'subLessonVideo' | 'moduleThumbnail'
    status: 'generating-url' | 'uploading' | 'processing' | 'completed' | 'error'
    error?: string
  }
}

export interface LessonResource {
  title: string
  url: string
  type: 'pdf' | 'document' | 'link' | 'video'
}

// SubLesson Interface
export interface SubLesson {
  _id?: string
  title: string
  description?: string
  content?: string
  videoSource?: VideoSource // Sub-lesson can have video
  duration: number
  isPreview: boolean
  resources: LessonResource[]
  order: number
  createdAt?: string
  updatedAt?: string
}

// UPDATED: Lesson Interface (now has videoSource and subLessons)
export interface Lesson {
  _id?: string
  title: string
  description?: string
  videoSource?: VideoSource // Lesson can have video too
  content?: string
  subLessons: SubLesson[]
  duration: number
  order: number
  createdAt?: string
  updatedAt?: string
}

export interface Chapter {
  _id?: string
  title: string
  description?: string
  order: number
  lessons: Lesson[]
  createdAt?: string
  updatedAt?: string
}

export interface Module {
  _id?: string
  title: string
  description?: string
  thumbnailUrl?: string
  chapters: Chapter[]
  order: number
  createdAt?: string
  updatedAt?: string
}

export interface CourseInstructor {
  _id: string
  firstName: string
  lastName: string
  username: string
  avatar?: string
}

export interface Course {
  _id: string
  title: string
  description: string
  shortDescription: string
  slug: string
  instructor: CourseInstructor
  price: number
  isFree: boolean
  level: 'beginner' | 'intermediate' | 'advanced'
  category?: string
  tags: string[]
  thumbnail: S3Asset | null
  previewVideo: S3Asset | null
  modules: Module[]
  requirements: string[]
  learningOutcomes: string[]
  isPublished: boolean
  isFeatured: boolean
  totalStudents: number
  averageRating: number
  totalDuration: number
  totalLessons: number
  totalSubLessons: number
  createdAt: string
  updatedAt: string
}