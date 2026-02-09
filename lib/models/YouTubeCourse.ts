import mongoose, { Schema, Document } from 'mongoose'

// YouTube Video Source Interface
export interface IYouTubeSource {
  type: 'youtube'
  videoId: string
  url: string
  thumbnailUrl?: string
  duration?: number
  title?: string
  channel?: string
}

// Lesson Resource Interface
export interface ILessonResource {
  _id?: mongoose.Types.ObjectId
  title: string
  url: string
  type: 'pdf' | 'document' | 'link' | 'youtube'
  description?: string
}

// Sub-Lesson Interface
export interface ISubLesson {
  _id?: mongoose.Types.ObjectId
  title: string
  description: string
  content?: string
  videoSource?: IYouTubeSource
  duration: number
  isPreview: boolean
  resources: ILessonResource[]
  order: number
  createdAt: Date
  updatedAt: Date
}

// Lesson Interface
export interface ILesson {
  _id?: mongoose.Types.ObjectId
  title: string
  description: string
  content?: string
  videoSource?: IYouTubeSource
  duration: number
  isPreview: boolean
  resources: ILessonResource[]
  subLessons: ISubLesson[]
  order: number
  createdAt: Date
  updatedAt: Date
}

// Chapter Interface
export interface IChapter {
  _id?: mongoose.Types.ObjectId
  title: string
  description?: string
  lessons: ILesson[]
  order: number
  createdAt: Date
  updatedAt: Date
}

// Module Interface
export interface IModule {
  _id?: mongoose.Types.ObjectId
  title: string
  description?: string
  thumbnailUrl?: string
  chapters: IChapter[]
  order: number
  createdAt: Date
  updatedAt: Date
}

// Manual Enrollment Interface
export interface IManualEnrollment {
  _id?: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  status: 'pending' | 'approved' | 'rejected'
  paymentMethod?: string
  transactionId?: string
  paymentProof?: string
  notes?: string
  approvedBy?: mongoose.Types.ObjectId
  approvedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Course Interface
export interface IYouTubeCourse extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  slug: string
  description: string
  shortDescription: string
  instructor: mongoose.Types.ObjectId
  price: number
  isFree: boolean
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  tags: string[]
  thumbnail: string
  previewVideo?: IYouTubeSource
  modules: IModule[]
  requirements: string[]
  learningOutcomes: string[]
  isPublished: boolean
  isFeatured: boolean
  
  // Manual enrollment system
  manualEnrollmentEnabled: boolean
  manualEnrollments: IManualEnrollment[]
  totalStudents: number
  
  // Stats
  averageRating: number
  ratings: Array<{
    user: mongoose.Types.ObjectId
    rating: number
    review?: string
    createdAt: Date
  }>
  
  createdAt: Date
  updatedAt: Date
}

const YouTubeSourceSchema = new Schema({
  type: { type: String, enum: ['youtube'], default: 'youtube' },
  videoId: { type: String, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  duration: { type: Number },
  title: { type: String },
  channel: { type: String }
}, { _id: false })

const LessonResourceSchema = new Schema({
  title: { type: String, required: true, maxlength: 200 },
  url: { type: String, required: true },
  type: { type: String, enum: ['pdf', 'document', 'link', 'youtube'], default: 'pdf' },
  description: { type: String, maxlength: 500 }
}, { _id: true })

const SubLessonSchema = new Schema({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  content: { type: String },
  videoSource: YouTubeSourceSchema,
  duration: { type: Number, default: 0, min: 0, max: 10000 },
  isPreview: { type: Boolean, default: false },
  resources: [LessonResourceSchema],
  order: { type: Number, default: 0 }
}, { timestamps: true })

const LessonSchema = new Schema({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  content: { type: String },
  videoSource: YouTubeSourceSchema,
  duration: { type: Number, default: 0, min: 0, max: 10000 },
  isPreview: { type: Boolean, default: false },
  resources: [LessonResourceSchema],
  subLessons: [SubLessonSchema],
  order: { type: Number, default: 0 }
}, { timestamps: true })

const ChapterSchema = new Schema({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  lessons: [LessonSchema],
  order: { type: Number, default: 0 }
}, { timestamps: true })

const ModuleSchema = new Schema({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  thumbnailUrl: { type: String },
  chapters: [ChapterSchema],
  order: { type: Number, default: 0 }
}, { timestamps: true })

const ManualEnrollmentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  paymentMethod: { type: String },
  transactionId: { type: String },
  paymentProof: { type: String },
  notes: { type: String },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
}, { timestamps: true })

const YouTubeCourseSchema = new Schema({
  title: { 
    type: String, 
    required: true, 
    maxlength: 100,
    unique: true 
  },
  slug: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true 
  },
  description: { type: String, required: true },
  shortDescription: { 
    type: String, 
    required: true, 
    maxlength: 200 
  },
  instructor: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  price: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  isFree: { type: Boolean, default: false },
  level: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    default: 'beginner' 
  },
  category: { type: String, maxlength: 50 },
  tags: [{ type: String, maxlength: 30 }],
  thumbnail: { type: String, required: true },
  previewVideo: YouTubeSourceSchema,
  modules: [ModuleSchema],
  requirements: [{ type: String, maxlength: 200 }],
  learningOutcomes: [{ type: String, maxlength: 200 }],
  isPublished: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  
  // Manual enrollment system
  manualEnrollmentEnabled: { type: Boolean, default: false },
  manualEnrollments: [ManualEnrollmentSchema],
  totalStudents: { type: Number, default: 0 },
  
  // Ratings
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  ratings: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes
YouTubeCourseSchema.index({ title: 'text', description: 'text', category: 'text' })
YouTubeCourseSchema.index({ slug: 1 })
YouTubeCourseSchema.index({ isPublished: 1 })
YouTubeCourseSchema.index({ isFeatured: 1 })
YouTubeCourseSchema.index({ category: 1 })
YouTubeCourseSchema.index({ instructor: 1 })
YouTubeCourseSchema.index({ createdAt: -1 })

// Virtual for total reviews
YouTubeCourseSchema.virtual('totalReviews').get(function() {
  return this.ratings.length
})

// Pre-save middleware for slug generation
YouTubeCourseSchema.pre('save', function(next) {
  if (!this.slug || this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100)
  }
  next()
})

export default mongoose.models.YouTubeCourse || 
  mongoose.model<IYouTubeCourse>('YouTubeCourse', YouTubeCourseSchema)