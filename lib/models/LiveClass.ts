// lib/models/LiveClass.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ILiveClass extends Document {
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  instructorAvatar?: string;
  roomName: string;
  scheduledFor: Date;
  duration: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    joinedAt: Date;
    leftAt?: Date;
  }>;
  maxParticipants?: number;
  recording: boolean;
  settings: {
    enableChat: boolean;
    enableScreenSharing: boolean;
    muteOnStart: boolean;
    videoOnStart: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LiveClassSchema = new Schema<ILiveClass>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    instructorId: {
      type: String,
      required: true,
      index: true
    },
    instructorName: {
      type: String,
      required: true
    },
    instructorAvatar: {
      type: String
    },
    roomName: {
      type: String,
      required: true,
      unique: true
    },
    scheduledFor: {
      type: Date,
      required: true,
      index: true
    },
    duration: {
      type: Number,
      required: true,
      min: [15, 'Duration must be at least 15 minutes'],
      max: [480, 'Duration cannot exceed 8 hours']
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'scheduled',
      index: true
    },
    participants: [{
      userId: { type: String, required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      joinedAt: { type: Date, default: Date.now },
      leftAt: Date
    }],
    maxParticipants: {
      type: Number,
      default: 50
    },
    recording: {
      type: Boolean,
      default: false
    },
    settings: {
      enableChat: { type: Boolean, default: true },
      enableScreenSharing: { type: Boolean, default: true },
      muteOnStart: { type: Boolean, default: true },
      videoOnStart: { type: Boolean, default: false }
    }
  },
  { 
    timestamps: true 
  }
);

// Indexes for better query performance
LiveClassSchema.index({ instructorId: 1, scheduledFor: -1 });
LiveClassSchema.index({ status: 1, scheduledFor: 1 });
LiveClassSchema.index({ 'participants.userId': 1 });

const LiveClass = mongoose.models.LiveClass || mongoose.model<ILiveClass>('LiveClass', LiveClassSchema);
export default LiveClass;