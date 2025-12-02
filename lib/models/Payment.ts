// lib/models/Payment.ts
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'khalti', 'free'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    required: true
  },
  paymentIntentId: String,
  pidx: String,
  metadata: {
    courseTitle: String,
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userEmail: String,
    userName: String
  },
  refunds: [{
    amount: Number,
    reason: String,
    createdAt: Date
  }]
}, {
  timestamps: true
});

// Define indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ courseId: 1 });
paymentSchema.index({ transactionId: 1 }, { unique: true });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: 1 });

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);