import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentRequest extends Document {
  userId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  paymentMethod: 'bank_transfer' | 'digital_wallet' | 'cash' | 'other';
  transactionId?: string;
  paymentProof?: {
    url: string;
    fileName: string;
    uploadedAt: Date;
  };
  adminNotes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRequestSchema = new Schema<IPaymentRequest>({
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
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'digital_wallet', 'cash', 'other'],
    required: true
  },
  transactionId: String,
  paymentProof: {
    url: String,
    fileName: String,
    uploadedAt: Date
  },
  adminNotes: String,
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date
}, {
  timestamps: true
});

// Indexes for faster queries
PaymentRequestSchema.index({ userId: 1, status: 1 });
PaymentRequestSchema.index({ courseId: 1, status: 1 });
PaymentRequestSchema.index({ createdAt: -1 });

export default mongoose.models.PaymentRequest || mongoose.model<IPaymentRequest>('PaymentRequest', PaymentRequestSchema);