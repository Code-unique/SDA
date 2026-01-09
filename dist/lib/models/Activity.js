// lib/models/Activity.ts
import mongoose, { Schema } from 'mongoose';
const ActivitySchema = new Schema({
    type: {
        type: String,
        enum: ['enrollment', 'progress', 'completion', 'rating', 'review'],
        required: true
    },
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
    courseTitle: {
        type: String,
        required: true
    },
    lessonId: {
        type: Schema.Types.ObjectId
    },
    progress: {
        type: Number,
        min: 0,
        max: 100
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    review: {
        type: String
    },
    metadata: {
        type: Schema.Types.Mixed
    }
}, {
    timestamps: true
});
// Index for efficient queries
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ courseId: 1, type: 1 });
ActivitySchema.index({ createdAt: -1 });
export default mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
