import mongoose from 'mongoose'

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
    required: true
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
    // Remove unique: true from here - define it in indexes below
  },
  paymentIntentId: String, // For Stripe
  pidx: String, // For Khalti
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
})

// Define ALL indexes separately (not in schema fields)
paymentSchema.index({ userId: 1, createdAt: -1 })
paymentSchema.index({ courseId: 1 })
paymentSchema.index({ transactionId: 1 }, { unique: true }) // Unique index defined here
paymentSchema.index({ status: 1 })
paymentSchema.index({ createdAt: 1 })

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema)