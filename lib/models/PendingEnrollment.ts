// lib/models/PendingEnrollment.ts
import mongoose from 'mongoose';

const pendingEnrollmentSchema = new mongoose.Schema({
  paymentIntentId: {
    type: String,
    index: true
  },
  pidx: {
    type: String,
    index: true
  },
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
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  amountInNPR: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'khalti'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Define indexes
pendingEnrollmentSchema.index({ paymentIntentId: 1 });
pendingEnrollmentSchema.index({ pidx: 1 });
pendingEnrollmentSchema.index({ userId: 1, courseId: 1 });
pendingEnrollmentSchema.index({ status: 1 });
pendingEnrollmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PendingEnrollment || mongoose.model('PendingEnrollment', pendingEnrollmentSchema);