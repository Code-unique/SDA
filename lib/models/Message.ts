//lib/models/Message.ts
import mongoose, { Document, Schema } from 'mongoose'

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId
  sender: mongoose.Types.ObjectId
  receiver: mongoose.Types.ObjectId
  content: string
  messageType: 'text' | 'image' | 'file'
  mediaUrl?: string
  read: boolean
  readAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[]
  lastMessage: mongoose.Types.ObjectId
  unreadCount: number
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    messageType: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    mediaUrl: String,
    read: { type: Boolean, default: false },
    readAt: Date,
  },
  { timestamps: true }
)

const ConversationSchema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    unreadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Indexes
MessageSchema.index({ conversation: 1, createdAt: -1 })
MessageSchema.index({ sender: 1, receiver: 1 })
ConversationSchema.index({ participants: 1 })
ConversationSchema.index({ updatedAt: -1 })

export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema)
export const Conversation = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema)