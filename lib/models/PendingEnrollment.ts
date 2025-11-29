import mongoose from 'mongoose'

const pendingEnrollmentSchema = new mongoose.Schema({
  paymentIntentId: String,
  pidx: String,
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
  amount: Number,
  amountInNPR: Number,
  currency: String,
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
    // Remove the index definition from here
  }
}, {
  timestamps: true
})

// Define indexes separately (not in schema fields)
pendingEnrollmentSchema.index({ paymentIntentId: 1 })
pendingEnrollmentSchema.index({ pidx: 1 })
pendingEnrollmentSchema.index({ userId: 1, courseId: 1 })
pendingEnrollmentSchema.index({ status: 1 })
pendingEnrollmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL index

export default mongoose.models.PendingEnrollment || mongoose.model('PendingEnrollment', pendingEnrollmentSchema)