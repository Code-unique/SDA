//lib/models/UserProgress.ts
import mongoose from 'mongoose'

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
  completedLessons: [{
    type: mongoose.Schema.Types.ObjectId,
    // Remove ref: 'Lesson' since Lesson is embedded in Course
  }],
  currentLesson: {
    type: mongoose.Schema.Types.ObjectId,
    // Remove ref: 'Lesson'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  timeSpent: {
    type: Number, // in minutes
    default: 0
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
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    content: String,
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
})

// Compound index for efficient queries
UserProgressSchema.index({ courseId: 1, userId: 1 }, { unique: true })

// Add method to calculate progress
UserProgressSchema.methods.calculateProgress = function(totalLessons: number) {
  this.progress = this.completedLessons.length / totalLessons
  if (this.progress === 1) {
    this.completed = true
    this.completedAt = new Date()
  }
  return this.progress
}

export default mongoose.models.UserProgress || mongoose.model('UserProgress', UserProgressSchema)