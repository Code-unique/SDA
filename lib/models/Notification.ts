// lib/models/Notification.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  user: Types.ObjectId;
  type: 'like' | 'comment' | 'follow' | 'course' | 'achievement' | 'message';
  fromUser?: Types.ObjectId;
  post?: Types.ObjectId;
  course?: Types.ObjectId;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'course', 'achievement', 'message'],
      required: true
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post'
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course'
    },
    message: {
      type: String,
      required: true,
      maxlength: 500
    },
    read: {
      type: Boolean,
      default: false
    },
    actionUrl: {
      type: String,
      maxlength: 500
    },
  },
  {
    timestamps: true
  }
);

// Index for faster queries
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);