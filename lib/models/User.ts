// lib/models/User.ts
import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  clerkId: string
  email: string
  username: string
  firstName: string
  lastName: string
  avatar: string
  banner: string
  bio: string
  location: string
  website: string
  role: 'user' | 'admin' | 'designer'
  interests: string[]
  skills: string[]
  isVerified: boolean
  onboardingCompleted: boolean
  followers: mongoose.Types.ObjectId[]
  following: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { 
      type: String, 
      required: true, 
      unique: true,
      index: true // Remove duplicate index definition
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      index: true // Remove duplicate index definition
    },
    username: { 
      type: String, 
      required: true, 
      unique: true,
      index: true // Remove duplicate index definition
    },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: { type: String, default: '' },
    banner: { type: String, default: '' },
    bio: { type: String, default: '' },
    location: { type: String, default: '' },
    website: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin', 'designer'], default: 'user' },
    interests: [{ type: String }],
    skills: [{ type: String }],
    isVerified: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

// Remove duplicate index definitions - they're already defined in the schema above
// UserSchema.index({ clerkId: 1 })
// UserSchema.index({ email: 1 })
// UserSchema.index({ username: 1 })

// Only add indexes that aren't already defined as unique
UserSchema.index({ followers: 1 })
UserSchema.index({ following: 1 })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)