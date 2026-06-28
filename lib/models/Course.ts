// lib/models/Course.ts - UPDATED WITH LESSON AND SUBLESSON VIDEOS
import mongoose, { Document, Schema, Model } from 'mongoose';
import { Types } from 'mongoose';

// S3 Asset Interface
export interface IS3Asset {
  key: string;
  url: string;
  size: number;
  type: 'image' | 'video';
  duration?: number;
  width?: number;
  height?: number;
  fileName?: string;
  originalFileName?: string;
}

// Video Source Interface
export interface IVideoSource {
  type: 'uploaded' | 'library';
  videoLibraryId?: mongoose.Types.ObjectId;
  video: IS3Asset;
  uploadedAt?: Date;
  uploadedBy?: mongoose.Types.ObjectId;
}

export interface ILessonResource {
  _id?: mongoose.Types.ObjectId;
  title: string;
  url: string;
  type: 'pdf' | 'document' | 'link' | 'video';
}

// SubLesson Interface
export interface ISubLesson {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  content: string;
  videoSource: IVideoSource; // Sub-lesson can have video
  duration: number;
  isPreview: boolean;
  resources: ILessonResource[];
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ILesson {
  _id: Types.ObjectId;
  title: string;
  description: string;
  videoSource: IVideoSource; // Lesson can have video too
  content?: string;
  subLessons: ISubLesson[];
  duration: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChapter {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  lessons: ILesson[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IModule {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  order: number;
  chapters: IChapter[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRating {
  _id?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStudentProgress {
  user: mongoose.Types.ObjectId;
  enrolledAt: Date;
  progress: number;
  completed: boolean;
  completedAt?: Date;
  paymentMethod?: 'bank_transfer' | 'digital_wallet' | 'cash' | 'other' | 'manual_grant';
  paymentAmount?: number;
  enrolledThrough: 'free' | 'manual_payment' | 'manual_grant' | 'promo';
  grantedBy?: mongoose.Types.ObjectId;
  paymentRequestId?: mongoose.Types.ObjectId;
}

export interface ICourse extends Document {
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  instructor: mongoose.Types.ObjectId;
  price: number;
  isFree: boolean;
  level: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  tags: string[];
  thumbnail: IS3Asset;
  previewVideo?: IS3Asset;
  modules: IModule[];
  ratings: IRating[];
  students: IStudentProgress[];
  totalStudents: number;
  averageRating: number;
  totalDuration: number;
  totalLessons: number;
  totalSubLessons: number;
  totalChapters: number;
  isPublished: boolean;
  isFeatured: boolean;
  requirements: string[];
  learningOutcomes: string[];
  createdAt: Date;
  updatedAt: Date;
  manualEnrollments: number;
}

// S3 Asset Schema
const S3AssetSchema = new Schema<IS3Asset>({
  key: { type: String, required: true },
  url: { type: String, required: true },
  size: { type: Number, required: true },
  type: { type: String, enum: ['image', 'video'], required: true },
  duration: Number,
  width: Number,
  height: Number,
  fileName: String,
  originalFileName: String
});

// Video Source Schema
const VideoSourceSchema = new Schema<IVideoSource>({
  type: { 
    type: String, 
    enum: ['uploaded', 'library'], 
    required: true,
    default: 'uploaded'
  },
  videoLibraryId: { type: Schema.Types.ObjectId, ref: 'VideoLibrary' },
  video: { type: S3AssetSchema, required: true },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }
});

const LessonResourceSchema = new Schema<ILessonResource>({
  title: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['pdf', 'document', 'link', 'video'], required: true }
});

// SubLesson Schema
const SubLessonSchema = new Schema<ISubLesson>({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  content: { type: String },
  videoSource: { type: VideoSourceSchema, required: true },
  duration: { type: Number, default: 0, min: 0, max: 10000 },
  isPreview: { type: Boolean, default: false },
  resources: [LessonResourceSchema],
  order: { type: Number, required: true, min: 0 }
}, { timestamps: true });

// UPDATED: Lesson Schema (now has videoSource and subLessons)
const LessonSchema = new Schema<ILesson>({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  videoSource: { type: VideoSourceSchema }, // Lesson can have video
  content: { type: String },
  subLessons: [SubLessonSchema],
  duration: { type: Number, default: 0, min: 0, max: 10000 },
  order: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const ChapterSchema = new Schema<IChapter>({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  order: { type: Number, required: true, min: 0 },
  lessons: [LessonSchema]
}, { timestamps: true });

const ModuleSchema = new Schema<IModule>({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, maxlength: 1000 },
  thumbnailUrl: { type: String },
  order: { type: Number, required: true, min: 0 },
  chapters: [ChapterSchema]
}, { timestamps: true });

const RatingSchema = new Schema<IRating>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
});

const StudentProgressSchema = new Schema<IStudentProgress>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  enrolledAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 0, min: 0, max: 1 },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'digital_wallet', 'cash', 'other', 'manual_grant']
  },
  paymentAmount: Number,
  enrolledThrough: {
    type: String,
    enum: ['free', 'manual_payment', 'manual_grant', 'promo'],
    default: 'free'
  },
  grantedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  paymentRequestId: { type: Schema.Types.ObjectId, ref: 'PaymentRequest' }
});

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
      maxlength: 50
    },
    tags: [{
      type: String,
      maxlength: 30
    }],
    thumbnail: {
      type: S3AssetSchema,
      required: true
    },
    previewVideo: S3AssetSchema,
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
    totalSubLessons: {
      type: Number,
      default: 0,
      min: 0
    },
    totalChapters: {
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
      type: String,
      maxlength: 200
    }],
    learningOutcomes: [{
      type: String,
      maxlength: 200
    }],
    manualEnrollments: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// UPDATED: Pre-save middleware for auto-calculated fields
CourseSchema.pre('save', function (next) {
  const course = this as ICourse;

  // Calculate total chapters
  course.totalChapters = course.modules.reduce((total, module) => 
    total + module.chapters.length, 0
  );

  // Calculate total lessons
  course.totalLessons = course.modules.reduce((total, module) =>
    total + module.chapters.reduce((chapterTotal, chapter) =>
      chapterTotal + chapter.lessons.length, 0
    ), 0
  );

  // Calculate total sub-lessons
  course.totalSubLessons = course.modules.reduce((total, module) =>
    total + module.chapters.reduce((chapterTotal, chapter) =>
      chapterTotal + chapter.lessons.reduce((lessonTotal, lesson) =>
        lessonTotal + lesson.subLessons.length, 0
      ), 0
    ), 0
  );

  // Calculate total duration (lesson duration + sum of all sub-lesson durations)
  course.totalDuration = course.modules.reduce((total, module) =>
    total + module.chapters.reduce((chapterTotal, chapter) =>
      chapterTotal + chapter.lessons.reduce((lessonTotal, lesson) => {
        // Add lesson duration
        let duration = lesson.duration || 0;
        
        // Add all sub-lesson durations
        duration += lesson.subLessons.reduce((subLessonTotal, subLesson) =>
          subLessonTotal + (subLesson.duration || 0), 0
        );
        
        return lessonTotal + duration;
      }, 0
    ), 0
  ), 0);

  // Generate slug if not provided or title changed
  if (this.isModified('title') || !course.slug) {
    course.slug = course.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);
  }

  // Update average rating if ratings changed
  if (this.isModified('ratings') && course.ratings.length > 0) {
    const sum = course.ratings.reduce((total, rating) => total + rating.rating, 0);
    course.averageRating = Math.round((sum / course.ratings.length) * 10) / 10;
  }

  // Calculate manual enrollments count
  if (this.isModified('students')) {
    course.manualEnrollments = course.students.filter(
      student => student.enrolledThrough === 'manual_payment' || student.enrolledThrough === 'manual_grant'
    ).length;
  }

  next();
});

// Indexes for better query performance
CourseSchema.index({ instructor: 1 });
CourseSchema.index({ isPublished: 1, isFeatured: 1 });
CourseSchema.index({ category: 1 });
CourseSchema.index({ 'students.user': 1 });
CourseSchema.index({ createdAt: -1 });
CourseSchema.index({ manualEnrollments: -1 });

// Static method to find published courses
CourseSchema.statics.findPublished = function () {
  return this.find({ isPublished: true });
};

// Instance method to add a student with manual enrollment support
CourseSchema.methods.addStudent = function (
  userId: mongoose.Types.ObjectId,
  enrolledThrough: 'free' | 'manual_payment' | 'manual_grant' | 'promo' = 'free',
  paymentMethod?: 'bank_transfer' | 'digital_wallet' | 'cash' | 'other' | 'manual_grant',
  paymentAmount?: number,
  grantedBy?: mongoose.Types.ObjectId,
  paymentRequestId?: mongoose.Types.ObjectId
) {
  const course = this as ICourse;
  const existingStudent = course.students.find(student =>
    student.user.toString() === userId.toString()
  );

  if (!existingStudent) {
    course.students.push({
      user: userId,
      enrolledAt: new Date(),
      progress: 0,
      completed: false,
      enrolledThrough,
      paymentMethod,
      paymentAmount,
      grantedBy,
      paymentRequestId
    } as IStudentProgress);
    course.totalStudents += 1;
    
    // Increment manual enrollments count if applicable
    if (enrolledThrough === 'manual_payment' || enrolledThrough === 'manual_grant') {
      course.manualEnrollments += 1;
    }
  }

  return this.save();
};

// Method to check if user is enrolled
CourseSchema.methods.isUserEnrolled = function (userId: mongoose.Types.ObjectId): boolean {
  const course = this as ICourse;
  return course.students.some(student =>
    student.user.toString() === userId.toString()
  );
};

// Method to get user's enrollment status
CourseSchema.methods.getUserEnrollment = function (userId: mongoose.Types.ObjectId) {
  const course = this as ICourse;
  return course.students.find(student =>
    student.user.toString() === userId.toString()
  );
};

// Define the model interface
interface ICourseModel extends Model<ICourse> {
  findPublished(): Promise<ICourse[]>;
}

// Export the model properly
const CourseModel = mongoose.models.Course as ICourseModel || 
  mongoose.model<ICourse, ICourseModel>('Course', CourseSchema);

export default CourseModel;