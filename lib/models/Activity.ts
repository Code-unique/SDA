//lib/models/Activity.ts
import mongoose, { Document, Schema } from 'mongoose'

export interface IActivity extends Document {
  type: 'enrollment' | 'progress' | 'completion' | 'rating' | 'review'
  userId: mongoose.Types.ObjectId
  courseId: mongoose.Types.ObjectId
  courseTitle: string
  lessonId?: mongoose.Types.ObjectId
  progress?: number
  rating?: number
  review?: string
  createdAt: Date
  metadata?: any
}

const ActivitySchema = new Schema<IActivity>({
  type: { 
    type: String, 
    enum: ['enrollment', 'progress', 'completion', 'rating', 'review'],
    required: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  courseId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  courseTitle: { 
    type: String, 
    required: true 
  },
  lessonId: { 
    type: Schema.Types.ObjectId 
  },
  progress: { 
    type: Number,
    min: 0,
    max: 100 
  },
  rating: { 
    type: Number,
    min: 1,
    max: 5 
  },
  review: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  metadata: { 
    type: Schema.Types.Mixed 
  }
}, {
  timestamps: true
})

// Index for efficient queries
ActivitySchema.index({ userId: 1, createdAt: -1 })
ActivitySchema.index({ courseId: 1, type: 1 })
ActivitySchema.index({ createdAt: -1 })

export default mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema)