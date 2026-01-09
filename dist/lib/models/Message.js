//lib/models/Message.ts
import mongoose, { Schema } from 'mongoose';
const MessageSchema = new Schema({
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    messageType: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    mediaUrl: String,
    read: { type: Boolean, default: false },
    readAt: Date,
}, { timestamps: true });
const ConversationSchema = new Schema({
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    unreadCount: { type: Number, default: 0 },
}, { timestamps: true });
// Indexes
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, receiver: 1 });
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ updatedAt: -1 });
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
