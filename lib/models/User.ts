// lib/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  clerkId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
  banner: string;
  bio: string;
  location: string;
  website: string;
  role: 'user' | 'admin' | 'designer';
  interests: string[];
  skills: string[];
  isVerified: boolean;
  onboardingCompleted: boolean;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      index: true,
      minlength: 3,
      maxlength: 30
    },
    firstName: {
      type: String,
      required: true,
      maxlength: 50
    },
    lastName: {
      type: String,
      required: true,
      maxlength: 50
    },
    avatar: {
      type: String,
      default: ''
    },
    banner: {
      type: String,
      default: ''
    },
    bio: {
      type: String,
      default: '',
      maxlength: 500
    },
    location: {
      type: String,
      default: '',
      maxlength: 100
    },
    website: {
      type: String,
      default: '',
      maxlength: 200
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'designer'],
      default: 'user'
    },
    interests: [{
      type: String,
      maxlength: 50
    }],
    skills: [{
      type: String,
      maxlength: 50
    }],
    isVerified: {
      type: Boolean,
      default: false
    },
    onboardingCompleted: {
      type: Boolean,
      default: false
    },
    followers: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    following: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });
UserSchema.index({ createdAt: -1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);