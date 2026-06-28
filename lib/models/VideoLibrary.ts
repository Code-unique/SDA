import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IVideoLibrary extends Document {
  title: string;
  description?: string;
  video: {
    key: string;
    url: string;
    size: number;
    type: 'video';
    duration?: number;
    width?: number;
    height?: number;
    originalFileName: string;
    mimeType: string;
  };
  uploadedBy: mongoose.Types.ObjectId;
  uploadDate: Date;
  categories: string[];
  tags: string[];
  usageCount: number;
  courses: Array<{
    courseId: mongoose.Types.ObjectId;
    courseTitle: string;
    moduleId?: mongoose.Types.ObjectId;
    chapterId?: mongoose.Types.ObjectId;
    lessonId?: mongoose.Types.ObjectId;
    usedAt: Date;
  }>;
  previews: Array<{
    accessedAt: Date;
    referrer?: string;
  }>;
  isPublic: boolean;
  metadata?: {
    resolution?: string;
    format?: string;
    bitrate?: number;
    frameRate?: number;
  };
  
  // Add these virtual properties
  formattedSize?: string;
  formattedDuration?: string;
  
  // Add these methods
  addUsage(
    courseId: mongoose.Types.ObjectId | string,
    courseTitle: string,
    moduleId?: mongoose.Types.ObjectId,
    chapterId?: mongoose.Types.ObjectId,
    lessonId?: mongoose.Types.ObjectId
  ): Promise<this>;
  
  addPreviewUsage(referrer?: string): Promise<this>;
  
  getUsageStats(): {
    totalUsage: number;
    courseUsage: number;
    previewUsage: number;
    uniqueCourses: number;
    recentUsage: Array<{ course: string; usedAt: Date }>;
    recentPreviews: Array<{ accessedAt: Date; referrer?: string }>;
  };
}

const VideoLibrarySchema = new Schema<IVideoLibrary>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      maxlength: 1000
    },
    video: {
      key: { type: String, required: true },
      url: { type: String, required: true },
      size: { type: Number, required: true },
      type: { type: String, enum: ['video'], default: 'video' },
      duration: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      originalFileName: { type: String, required: true },
      mimeType: { type: String, required: true }
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    categories: [{
      type: String,
      maxlength: 50
    }],
    tags: [{
      type: String,
      maxlength: 30
    }],
    usageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    courses: [{
      courseId: { 
        type: Schema.Types.ObjectId, 
        ref: 'Course',
        required: true,
        set: function(value: any) {
          if (value === 'preview' || value === '000000000000000000000000') {
            return new mongoose.Types.ObjectId('000000000000000000000000');
          }
          if (typeof value === 'string') {
            return new mongoose.Types.ObjectId(value);
          }
          return value;
        }
      },
      courseTitle: { type: String, required: true },
      moduleId: { type: Schema.Types.ObjectId },
      chapterId: { type: Schema.Types.ObjectId },
      lessonId: { type: Schema.Types.ObjectId },
      usedAt: { type: Date, default: Date.now }
    }],
    previews: [{
      accessedAt: { type: Date, default: Date.now },
      referrer: String
    }],
    isPublic: {
      type: Boolean,
      default: true
    },
    metadata: {
      resolution: String,
      format: String,
      bitrate: Number,
      frameRate: Number
    }
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true, 
      transform: function(doc, ret) {
        // Transform courseId for previews
        ret.courses = ret.courses?.map((course: any) => ({
          ...course,
          courseId: course.courseId?.toString() === '000000000000000000000000' ? 'preview' : course.courseId?.toString()
        }));
        return ret;
      }
    },
    toObject: { 
      virtuals: true, 
      transform: function(doc, ret) {
        ret.courses = ret.courses?.map((course: any) => ({
          ...course,
          courseId: course.courseId?.toString() === '000000000000000000000000' ? 'preview' : course.courseId?.toString()
        }));
        return ret;
      }
    }
  }
);

// Virtual for formatted size
VideoLibrarySchema.virtual('formattedSize').get(function() {
  const bytes = this.video?.size || 0;
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
});

// Virtual for formatted duration
VideoLibrarySchema.virtual('formattedDuration').get(function() {
  const seconds = this.video?.duration || 0;
  if (!seconds || seconds <= 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
});

// Indexes
VideoLibrarySchema.index({ title: 'text', description: 'text', tags: 'text' });
VideoLibrarySchema.index({ categories: 1 });
VideoLibrarySchema.index({ uploadedBy: 1 });
VideoLibrarySchema.index({ uploadDate: -1 });
VideoLibrarySchema.index({ usageCount: -1 });
VideoLibrarySchema.index({ 'video.size': 1 });
VideoLibrarySchema.index({ 'video.duration': 1 });

// Pre-save middleware
VideoLibrarySchema.pre('save', function(next) {
  if (this.isNew) {
    this.uploadDate = new Date();
  }
  next();
});

// Method to add usage record
VideoLibrarySchema.methods.addUsage = function(
  courseId: mongoose.Types.ObjectId | string,
  courseTitle: string,
  moduleId?: mongoose.Types.ObjectId,
  chapterId?: mongoose.Types.ObjectId,
  lessonId?: mongoose.Types.ObjectId
) {
  // Handle preview case
  if (courseId === 'preview') {
    return this.addPreviewUsage('course_creator');
  }
  
  // Convert string to ObjectId if needed
  const courseObjectId = typeof courseId === 'string' 
    ? new mongoose.Types.ObjectId(courseId)
    : courseId;
  
  this.courses.push({
    courseId: courseObjectId,
    courseTitle,
    moduleId,
    chapterId,
    lessonId,
    usedAt: new Date()
  });
  this.usageCount += 1;
  return this.save();
};

// Method to add preview usage
VideoLibrarySchema.methods.addPreviewUsage = function(referrer?: string) {
  this.previews.push({
    accessedAt: new Date(),
    referrer: referrer || 'course_creator'
  });
  this.usageCount += 1;
  return this.save();
};

// Method to get usage statistics
VideoLibrarySchema.methods.getUsageStats = function() {
  const uniqueCourses = [...new Set(this.courses
    .filter((c: any) => c.courseId?.toString() !== '000000000000000000000000')
    .map((c: any) => c.courseId.toString()))];
  return {
    totalUsage: this.usageCount,
    courseUsage: this.courses.filter((c: any) => c.courseId?.toString() !== '000000000000000000000000').length,
    previewUsage: this.previews.length,
    uniqueCourses: uniqueCourses.length,
    recentUsage: this.courses
      .filter((c: any) => c.courseId?.toString() !== '000000000000000000000000')
      .slice(-5)
      .map((c: any) => ({
        course: c.courseTitle,
        usedAt: c.usedAt
      })),
    recentPreviews: this.previews.slice(-5).map((p: any) => ({
      accessedAt: p.accessedAt,
      referrer: p.referrer
    }))
  };
};

// Static method to search videos
VideoLibrarySchema.statics.searchVideos = async function(
  filters: {
    search?: string;
    categories?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    durationMin?: number;
    durationMax?: number;
    sizeMin?: number;
    sizeMax?: number;
    uploadedBy?: string;
    dateFrom?: Date;
    dateTo?: Date;
    showOnlyMine?: boolean;
    type?: string;
  }
) {
  const {
    search = '',
    categories = [],
    sortBy = 'uploadDate',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
    durationMin,
    durationMax,
    sizeMin,
    sizeMax,
    uploadedBy,
    dateFrom,
    dateTo,
    showOnlyMine,
    type = 'all'
  } = filters;
  
  const skip = (page - 1) * limit;
  
  const searchQuery: any = {};
  
  // Text search
  if (search && search.trim()) {
    searchQuery.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } },
      { tags: { $regex: search.trim(), $options: 'i' } },
      { 'video.originalFileName': { $regex: search.trim(), $options: 'i' } }
    ];
  }
  
  // Category filter
  if (categories.length > 0) {
    searchQuery.categories = { $in: categories };
  }
  
  // Duration filter
  if (durationMin !== undefined || durationMax !== undefined) {
    searchQuery['video.duration'] = {};
    if (durationMin !== undefined) {
      searchQuery['video.duration'].$gte = durationMin;
    }
    if (durationMax !== undefined) {
      searchQuery['video.duration'].$lte = durationMax;
    }
  }
  
  // Size filter
  if (sizeMin !== undefined || sizeMax !== undefined) {
    searchQuery['video.size'] = {};
    if (sizeMin !== undefined) {
      searchQuery['video.size'].$gte = sizeMin;
    }
    if (sizeMax !== undefined) {
      searchQuery['video.size'].$lte = sizeMax;
    }
  }
  
  // Uploaded by filter
  if (uploadedBy) {
    try {
      searchQuery.uploadedBy = new mongoose.Types.ObjectId(uploadedBy);
    } catch (error) {
      console.warn('Invalid uploadedBy ObjectId:', uploadedBy);
    }
  }
  
  // Date range filter
  if (dateFrom || dateTo) {
    searchQuery.uploadDate = {};
    if (dateFrom) {
      searchQuery.uploadDate.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      searchQuery.uploadDate.$lte = new Date(dateTo);
    }
  }
  
  // Show only mine filter
  if (showOnlyMine && uploadedBy) {
    try {
      searchQuery.uploadedBy = new mongoose.Types.ObjectId(uploadedBy);
    } catch (error) {
      console.warn('Invalid uploadedBy ObjectId for showOnlyMine:', uploadedBy);
    }
  }
  
  // Type filter
  if (type !== 'all') {
    if (type === 'lesson') {
      searchQuery.categories = { $in: ['lessonVideo', 'lesson'] };
    } else if (type === 'preview') {
      searchQuery.categories = { $in: ['previewVideo', 'preview'] };
    }
  }
  
  // Build sort options
  const sortOptions: any = {};
  if (sortBy === 'uploadDate') {
    sortOptions.uploadDate = sortOrder === 'desc' ? -1 : 1;
  } else if (sortBy === 'title') {
    sortOptions.title = sortOrder === 'desc' ? 1 : -1;
  } else if (sortBy === 'size') {
    sortOptions['video.size'] = sortOrder === 'desc' ? -1 : 1;
  } else if (sortBy === 'duration') {
    sortOptions['video.duration'] = sortOrder === 'desc' ? -1 : 1;
  } else if (sortBy === 'usage') {
    sortOptions.usageCount = sortOrder === 'desc' ? -1 : 1;
  } else {
    sortOptions.uploadDate = -1;
  }
  
  try {
    const [videos, total] = await Promise.all([
      this.find(searchQuery)
        .populate('uploadedBy', 'firstName lastName username avatar email')
        .populate('courses.courseId', 'title slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.countDocuments(searchQuery)
    ]);
    
    // Get unique categories
    const categoryResults = await this.distinct('categories');
    
    return {
      videos: videos as IVideoLibrary[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
      categories: categoryResults.filter(Boolean)
    };
  } catch (error: any) {
    console.error('Error in searchVideos:', error);
    throw new Error(`Search failed: ${error.message}`);
  }
};

// Define model interface with static methods
export interface IVideoLibraryModel extends Model<IVideoLibrary> {
  searchVideos(filters: {
    search?: string;
    categories?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    durationMin?: number;
    durationMax?: number;
    sizeMin?: number;
    sizeMax?: number;
    uploadedBy?: string;
    dateFrom?: Date;
    dateTo?: Date;
    showOnlyMine?: boolean;
    type?: string;
  }): Promise<{
    videos: IVideoLibrary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
    categories: string[];
  }>;
}

export default (mongoose.models.VideoLibrary as IVideoLibraryModel) ||
  mongoose.model<IVideoLibrary, IVideoLibraryModel>('VideoLibrary', VideoLibrarySchema);