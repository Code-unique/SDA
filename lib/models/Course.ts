//lib/models/Course.ts
import mongoose, { Document, Schema, Model } from 'mongoose'

export interface ICloudinaryAsset {
  public_id: string
  secure_url: string
  format: string
  resource_type: 'image' | 'video'
  width?: number
  height?: number
  duration?: number
  bytes: number
}

export interface ILessonResource {
  title: string
  url: string
  type: 'pdf' | 'document' | 'link' | 'video'
}

export interface ILesson {
  _id?: mongoose.Types.ObjectId
  title: string
  description: string
  content: string
  video: ICloudinaryAsset
  duration: number
  isPreview: boolean
  resources: ILessonResource[]
  order: number
}

export interface IModule {
  _id?: mongoose.Types.ObjectId
  title: string
  description: string
  lessons: ILesson[]
  order: number
}

export interface IRating {
  _id?: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  rating: number
  review?: string
  createdAt: Date
  updatedAt?: Date
}

export interface IStudentProgress {
  user: mongoose.Types.ObjectId
  enrolledAt: Date
  progress: number
  completed: boolean
  completedAt?: Date
}

export interface ICourse extends Document {
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
  thumbnail: ICloudinaryAsset
  previewVideo?: ICloudinaryAsset
  modules: IModule[]
  ratings: IRating[]
  students: IStudentProgress[]
  totalStudents: number
  averageRating: number
  totalDuration: number
  totalLessons: number
  isPublished: boolean
  isFeatured: boolean
  requirements: string[]
  learningOutcomes: string[]
  createdAt: Date
  updatedAt: Date
}

const CloudinaryAssetSchema = new Schema<ICloudinaryAsset>({
  public_id: { type: String, required: true },
  secure_url: { type: String, required: true },
  format: { type: String, required: true },
  resource_type: { type: String, enum: ['image', 'video'], required: true },
  width: Number,
  height: Number,
  duration: Number,
  bytes: { type: Number, required: true }
})

const LessonResourceSchema = new Schema<ILessonResource>({
  title: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['pdf', 'document', 'link', 'video'], required: true }
})

const LessonSchema = new Schema<ILesson>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  video: { type: CloudinaryAssetSchema, required: true },
  duration: { type: Number, default: 0, min: 0 },
  isPreview: { type: Boolean, default: false },
  resources: [LessonResourceSchema],
  order: { type: Number, required: true, min: 0 }
})

const ModuleSchema = new Schema<IModule>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  lessons: [LessonSchema],
  order: { type: Number, required: true, min: 0 }
})

const RatingSchema = new Schema<IRating>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String },
  createdAt: { type: Date, default: Date.now }
})

const StudentProgressSchema = new Schema<IStudentProgress>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  enrolledAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 0, min: 0, max: 1 },
  completed: { type: Boolean, default: false },
  completedAt: Date
})

const CourseSchema = new Schema<ICourse>(
  {
    title: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 100 
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true 
    },
    description: { 
      type: String, 
      required: true 
    },
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
    isFree: { 
      type: Boolean, 
      default: false 
    },
    level: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced'], 
      required: true 
    },
    category: { 
      type: String, 
      required: true 
    },
    tags: [{ 
      type: String 
    }],
    thumbnail: { 
      type: CloudinaryAssetSchema, 
      required: true 
    },
    previewVideo: CloudinaryAssetSchema,
    modules: [ModuleSchema],
    ratings: [RatingSchema],
    students: [StudentProgressSchema],
    totalStudents: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    averageRating: { 
      type: Number, 
      default: 0,
      min: 0,
      max: 5 
    },
    totalDuration: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    totalLessons: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    isPublished: { 
      type: Boolean, 
      default: false 
    },
    isFeatured: { 
      type: Boolean, 
      default: false 
    },
    requirements: [{ 
      type: String 
    }],
    learningOutcomes: [{ 
      type: String 
    }]
  },
  { 
    timestamps: true
  }
)

// Pre-save middleware for auto-calculated fields
CourseSchema.pre('save', function(next) {
  const course = this as ICourse
  
  // Calculate total lessons
  course.totalLessons = course.modules.reduce((total, module) => 
    total + module.lessons.length, 0
  )
  
  // Calculate total duration
  course.totalDuration = course.modules.reduce((total, module) => 
    total + module.lessons.reduce((moduleTotal, lesson) => 
      moduleTotal + (lesson.duration || 0), 0
    ), 0
  )
  
  // Generate slug if not provided or title changed
  if (this.isModified('title') || !course.slug) {
    course.slug = course.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }
  
  // Update average rating if ratings changed
  if (this.isModified('ratings') && course.ratings.length > 0) {
    const sum = course.ratings.reduce((total, rating) => total + rating.rating, 0)
    course.averageRating = Math.round((sum / course.ratings.length) * 10) / 10
  }
  
  next()
})

// Indexes for better query performance

CourseSchema.index({ instructor: 1 })
CourseSchema.index({ isPublished: 1, isFeatured: 1 })
CourseSchema.index({ category: 1 })
CourseSchema.index({ 'students.user': 1 })
CourseSchema.index({ createdAt: -1 })

// Static method to find published courses
CourseSchema.statics.findPublished = function() {
  return this.find({ isPublished: true })
}

// Instance method to add a student
CourseSchema.methods.addStudent = function(userId: mongoose.Types.ObjectId) {
  const course = this as ICourse
  const existingStudent = course.students.find(student => 
    student.user.toString() === userId.toString()
  )
  
  if (!existingStudent) {
    course.students.push({
      user: userId,
      enrolledAt: new Date(),
      progress: 0,
      completed: false
    } as IStudentProgress)
    course.totalStudents += 1
  }
  
  return this.save()
}

// Define the model interface
interface ICourseModel extends Model<ICourse> {
  findPublished(): Promise<ICourse[]>
}

// Export the model properly
export default mongoose.models.Course as ICourseModel || mongoose.model<ICourse, ICourseModel>('Course', CourseSchema)