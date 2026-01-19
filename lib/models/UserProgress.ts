// lib/models/UserProgress.ts - UPDATED FOR LESSON AND SUBLESSON VIDEOS
import mongoose from 'mongoose';

const UserProgressSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedLessons: [{ // Tracks both lesson and sub-lesson completions
    type: mongoose.Schema.Types.ObjectId
  }],
  currentLesson: {
    type: mongoose.Schema.Types.ObjectId
  },
  contentType: { // NEW: Indicates whether current content is lesson or sublesson
    type: String,
    enum: ['lesson', 'sublesson'],
    default: 'sublesson'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  timeSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  notes: [{
    lessonId: { // Can be either lesson or sub-lesson ID
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    contentType: { // NEW: Type of content this note belongs to
      type: String,
      enum: ['lesson', 'sublesson'],
      default: 'sublesson'
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound index for efficient queries
UserProgressSchema.index({ courseId: 1, userId: 1 }, { unique: true });
UserProgressSchema.index({ userId: 1 });
UserProgressSchema.index({ courseId: 1 });

// Method to calculate progress based on video content
UserProgressSchema.methods.calculateProgress = function (course: any) {
  // Count total video content (lessons with videos + sub-lessons with videos)
  let totalVideoContent = 0;
  
  if (course.modules) {
    course.modules.forEach((module: any) => {
      if (module.chapters) {
        module.chapters.forEach((chapter: any) => {
          if (chapter.lessons) {
            chapter.lessons.forEach((lesson: any) => {
              // Count lesson if it has video
              if (lesson.videoSource) {
                totalVideoContent += 1;
              }
              
              // Count sub-lessons with videos
              if (lesson.subLessons) {
                lesson.subLessons.forEach((subLesson: any) => {
                  if (subLesson.videoSource) {
                    totalVideoContent += 1;
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  if (totalVideoContent === 0) {
    this.progress = 0;
    return this.progress;
  }

  // Calculate progress based on completed video content
  this.progress = this.completedLessons.length / totalVideoContent;
  
  if (this.progress === 1) {
    this.completed = true;
    this.completedAt = new Date();
  }
  
  return this.progress;
};

// Method to check if content is completed
UserProgressSchema.methods.isContentCompleted = function (contentId: mongoose.Types.ObjectId) {
  return this.completedLessons.some((id: mongoose.Types.ObjectId) => 
    id.toString() === contentId.toString()
  );
};

// Method to get next content item
UserProgressSchema.methods.getNextContent = function (course: any) {
  const allContent: Array<{
    id: mongoose.Types.ObjectId,
    type: 'lesson' | 'sublesson',
    moduleIndex: number,
    chapterIndex: number,
    lessonIndex: number,
    subLessonIndex?: number
  }> = [];

  // Collect all video content in order
  course.modules.forEach((module: any, moduleIndex: number) => {
    module.chapters.forEach((chapter: any, chapterIndex: number) => {
      chapter.lessons.forEach((lesson: any, lessonIndex: number) => {
        // Add lesson if it has video
        if (lesson.videoSource) {
          allContent.push({
            id: lesson._id,
            type: 'lesson',
            moduleIndex,
            chapterIndex,
            lessonIndex
          });
        }
        
        // Add sub-lessons with videos
        if (lesson.subLessons) {
          lesson.subLessons.forEach((subLesson: any, subLessonIndex: number) => {
            if (subLesson.videoSource) {
              allContent.push({
                id: subLesson._id,
                type: 'sublesson',
                moduleIndex,
                chapterIndex,
                lessonIndex,
                subLessonIndex
              });
            }
          });
        }
      });
    });
  });

  // Find current content
  const currentIndex = allContent.findIndex(content => 
    content.id.toString() === this.currentLesson?.toString()
  );

  // Return next content or null if at the end
  if (currentIndex < allContent.length - 1) {
    return allContent[currentIndex + 1];
  }

  return null;
};

export default mongoose.models.UserProgress || mongoose.model('UserProgress', UserProgressSchema);