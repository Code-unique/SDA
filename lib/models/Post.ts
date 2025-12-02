// lib/models/Post.ts
import mongoose, { Document, Schema, Types, Model } from 'mongoose';

// Extend the Document interface to include custom methods
export interface IPost extends Document {
  author: Types.ObjectId;
  media: {
    type: 'image' | 'video' | 'gif';
    url: string;
    thumbnail?: string;
    publicId: string;
    alt?: string;
    width?: number;
    height?: number;
    duration?: number;
  }[];
  caption: string;
  hashtags: string[];
  mentions: string[];
  likes: Types.ObjectId[];
  comments: {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    text: string;
    likes: Types.ObjectId[];
    replies: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
    isEdited: boolean;
  }[];
  saves: Types.ObjectId[];
  shares: number;
  views: number;
  engagement: number;
  location?: string;
  category?: string;
  style?: {
    colors: string[];
    style: string[];
    materials: string[];
  };
  isPublic: boolean;
  isSponsored: boolean;
  isFeatured: boolean;
  isEdited: boolean;
  aiGenerated: boolean;
  collaboration: boolean;
  availableForSale: boolean;
  price?: number;
  currency?: string;
  challenge?: {
    name: string;
    id: Types.ObjectId;
  };
  music?: {
    title: string;
    artist: string;
    url: string;
  };
  createdAt: Date;
  updatedAt: Date;

  // Add the custom method to the interface
  calculateEngagement(): number;
}

// Define the schema
const PostSchema = new Schema<IPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    media: [{
      type: {
        type: String,
        enum: ['image', 'video', 'gif'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      thumbnail: String,
      publicId: String,
      alt: String,
      width: Number,
      height: Number,
      duration: Number,
    }],
    caption: {
      type: String,
      required: true,
      maxlength: 2200
    },
    hashtags: [{
      type: String,
      lowercase: true,
      maxlength: 30
    }],
    mentions: [{
      type: String
    }],
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    comments: [{
      _id: {
        type: Schema.Types.ObjectId,
        auto: true
      },
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      text: {
        type: String,
        required: true,
        maxlength: 1000
      },
      likes: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
      }],
      replies: [{
        type: Schema.Types.ObjectId,
        ref: 'Comment'
      }],
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      isEdited: { type: Boolean, default: false }
    }],
    saves: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    shares: {
      type: Number,
      default: 0,
      min: 0
    },
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    engagement: {
      type: Number,
      default: 0,
      min: 0
    },
    location: String,
    category: String,
    style: {
      colors: [String],
      style: [String],
      materials: [String]
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    isSponsored: {
      type: Boolean,
      default: false
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    aiGenerated: {
      type: Boolean,
      default: false
    },
    collaboration: {
      type: Boolean,
      default: false
    },
    availableForSale: {
      type: Boolean,
      default: false
    },
    price: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    challenge: {
      name: String,
      id: {
        type: Schema.Types.ObjectId,
        ref: 'Challenge'
      }
    },
    music: {
      title: String,
      artist: String,
      url: String
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ hashtags: 1 });
PostSchema.index({ likes: -1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ isFeatured: -1, createdAt: -1 });
PostSchema.index({ engagement: -1 });
PostSchema.index({ 'challenge.id': 1 });

// Virtual for comment count
PostSchema.virtual('commentCount').get(function (this: IPost) {
  return this.comments.length;
});

// Method to calculate engagement
PostSchema.methods.calculateEngagement = function (this: IPost): number {
  const likesWeight = this.likes.length * 1;
  const commentsWeight = this.comments.length * 2;
  const viewsWeight = this.views * 0.1;
  const sharesWeight = this.shares * 3;

  this.engagement = likesWeight + commentsWeight + viewsWeight + sharesWeight;
  return this.engagement;
};

// Pre-save middleware to calculate engagement
PostSchema.pre('save', function (this: IPost, next) {
  if (this.isModified('likes') || this.isModified('comments') || this.isModified('views') || this.isModified('shares')) {
    this.calculateEngagement();
  }
  next();
});

// Create and export the model
const PostModel = mongoose.models.Post as Model<IPost> || mongoose.model<IPost>('Post', PostSchema);

export default PostModel;