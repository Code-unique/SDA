// types/course.ts

export interface S3Asset {
  key: string
  url: string
  size: number
  type: 'image' | 'video'
  duration?: number
  width?: number
  height?: number
}

export interface UploadProgress {
  [key: string]: {
    progress: number
    fileName: string
    type: 'thumbnail' | 'previewVideo' | 'lessonVideo'
    status: 'generating-url' | 'uploading' | 'processing' | 'completed' | 'error'
    error?: string
  }
}

export interface LessonResource {
  title: string
  url: string
  type: 'pdf' | 'document' | 'link' | 'video'
}

export interface Lesson {
  _id?: string
  title: string
  description: string
  content: string
  video?: S3Asset
  duration: number
  isPreview: boolean
  resources: LessonResource[]
  order: number
}

export interface Module {
  _id?: string
  title: string
  description: string
  lessons: Lesson[]
  order: number
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
  category: string
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
  createdAt: string
  updatedAt: string
}