import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  user: Types.ObjectId;
  type: 'like' | 'comment' | 'follow' | 'course' | 'achievement' | 'message' | 'system';
  fromUser?: Types.ObjectId;
  post?: Types.ObjectId;
  course?: Types.ObjectId;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'course', 'achievement', 'message', 'system'],
      required: true,
      index: true
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      index: true
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      index: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    actionUrl: {
      type: String,
      maxlength: 500,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for common queries
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });

// Virtual for days ago
NotificationSchema.virtual('daysAgo').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to ensure data consistency
NotificationSchema.pre('save', function(next) {
  if (this.message.length > 500) {
    this.message = this.message.substring(0, 497) + '...';
  }
  if (this.actionUrl && this.actionUrl.length > 500) {
    this.actionUrl = this.actionUrl.substring(0, 497) + '...';
  }
  next();
});

export default mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);