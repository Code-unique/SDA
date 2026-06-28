import mongoose, { Schema, Document } from 'mongoose';

export interface IManualAccess extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  grantedBy: mongoose.Types.ObjectId;
  reason?: string;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ManualAccessSchema = new Schema<IManualAccess>({
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
  grantedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: String,
  expiresAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
ManualAccessSchema.index({ userId: 1, courseId: 1 });
ManualAccessSchema.index({ isActive: 1, expiresAt: 1 });

export default mongoose.models.ManualAccess || mongoose.model<IManualAccess>('ManualAccess', ManualAccessSchema);