import mongoose, { Document, Schema, Model } from 'mongoose';

// S3 Asset Interface
export interface IS3Asset {
  key: string;
  url: string;
  size: number;
  type: 'image' | 'video';
  duration?: number;
  width?: number;
  height?: number;
}

export interface ILessonResource {
  title: string;
  url: string;
  type: 'pdf' | 'document' | 'link' | 'video';
}

export interface ILesson {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  content: string;
  video: IS3Asset;
  duration: number;
  isPreview: boolean;
  resources: ILessonResource[];
  order: number;
}

export interface IChapter {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  order: number;
  lessons: ILesson[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IModule {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  thumbnailUrl?: string; // NEW FIELD
  order: number;
  chapters: IChapter[]; // Changed from lessons to chapters
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRating {
  _id?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  review?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IStudentProgress {
  user: mongoose.Types.ObjectId;
  enrolledAt: Date;
  progress: number;
  completed: boolean;
  completedAt?: Date;
  paymentMethod?: string;
  paymentAmount?: number;
  enrolledThrough?: string;
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
  category: string;
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
  isPublished: boolean;
  isFeatured: boolean;
  requirements: string[];
  learningOutcomes: string[];
  createdAt: Date;
  updatedAt: Date;
}

// S3 Asset Schema
const S3AssetSchema = new Schema<IS3Asset>({
  key: { type: String, required: true },
  url: { type: String, required: true },
  size: { type: Number, required: true },
  type: { type: String, enum: ['image', 'video'], required: true },
  duration: Number,
  width: Number,
  height: Number
});

const LessonResourceSchema = new Schema<ILessonResource>({
  title: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['pdf', 'document', 'link', 'video'], required: true }
});

const LessonSchema = new Schema<ILesson>({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 1000 },
  content: { type: String, required: true },
  video: { type: S3AssetSchema, required: true },
  duration: { type: Number, default: 0, min: 0, max: 10000 },
  isPreview: { type: Boolean, default: false },
  resources: [LessonResourceSchema],
  order: { type: Number, required: true, min: 0 }
}, { timestamps: true });

const ChapterSchema = new Schema<IChapter>({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 1000 },
  order: { type: Number, required: true, min: 0 },
  lessons: [LessonSchema]
}, { timestamps: true });

const ModuleSchema = new Schema<IModule>({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 1000 },
  thumbnailUrl: { type: String }, // NEW FIELD
  order: { type: Number, required: true, min: 0 },
  chapters: [ChapterSchema] // Changed from lessons to chapters
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
  paymentMethod: String,
  paymentAmount: Number,
  enrolledThrough: String
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
      required: true,
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
    }]
  },
  {
    timestamps: true
  }
);

// Pre-save middleware for auto-calculated fields
CourseSchema.pre('save', function (next) {
  const course = this as ICourse;

  // Calculate total lessons across all chapters in all modules
  course.totalLessons = course.modules.reduce((total, module) =>
    total + module.chapters.reduce((chapterTotal, chapter) =>
      chapterTotal + chapter.lessons.length, 0
    ), 0
  );

  // Calculate total duration across all lessons in all chapters in all modules
  course.totalDuration = course.modules.reduce((total, module) =>
    total + module.chapters.reduce((chapterTotal, chapter) =>
      chapterTotal + chapter.lessons.reduce((lessonTotal, lesson) =>
        lessonTotal + (lesson.duration || 0), 0
      ), 0
    ), 0
  );

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

  next();
});

// Indexes for better query performance
CourseSchema.index({ instructor: 1 });
CourseSchema.index({ isPublished: 1, isFeatured: 1 });
CourseSchema.index({ category: 1 });
CourseSchema.index({ 'students.user': 1 });
CourseSchema.index({ createdAt: -1 });

// Static method to find published courses
CourseSchema.statics.findPublished = function () {
  return this.find({ isPublished: true });
};

// Instance method to add a student
CourseSchema.methods.addStudent = function (userId: mongoose.Types.ObjectId) {
  const course = this as ICourse;
  const existingStudent = course.students.find(student =>
    student.user.toString() === userId.toString()
  );

  if (!existingStudent) {
    course.students.push({
      user: userId,
      enrolledAt: new Date(),
      progress: 0,
      completed: false
    } as IStudentProgress);
    course.totalStudents += 1;
  }

  return this.save();
};

// Define the model interface
interface ICourseModel extends Model<ICourse> {
  findPublished(): Promise<ICourse[]>;
}

// Export the model properly
export default mongoose.models.Course as ICourseModel || mongoose.model<ICourse, ICourseModel>('Course', CourseSchema);