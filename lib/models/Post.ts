import mongoose, { Document, Schema, Types, Model } from 'mongoose';

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
    size?: number;
    mimetype?: string;
    order: number;
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
  
  // Media metadata
  mediaCount: number;
  totalDuration: number;
  containsVideo: boolean;
  
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
}

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
      size: Number,
      mimetype: String,
      order: {
        type: Number,
        default: 0
      }
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
    // Media metadata
    mediaCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 4
    },
    totalDuration: {
      type: Number,
      default: 0,
      min: 0,
      max: 120 // 2 minutes in seconds
    },
    containsVideo: {
      type: Boolean,
      default: false
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

// Indexes for media queries
PostSchema.index({ 'media.type': 1 });
PostSchema.index({ mediaCount: -1 });
PostSchema.index({ containsVideo: 1 });
PostSchema.index({ totalDuration: -1 });

// Virtuals
PostSchema.virtual('commentCount').get(function (this: IPost) {
  return this.comments.length;
});

PostSchema.virtual('hasMultipleMedia').get(function (this: IPost) {
  return this.mediaCount > 1;
});

// Pre-save middleware to update media metadata
PostSchema.pre('save', function (this: IPost, next) {
  this.mediaCount = this.media.length;
  
  // Calculate total duration and check for videos
  this.totalDuration = 0;
  this.containsVideo = false;
  
  this.media.forEach(item => {
    if (item.type === 'video' && item.duration) {
      this.totalDuration += item.duration;
      this.containsVideo = true;
    }
    
    // Set order if not provided
    if (!item.order && item.order !== 0) {
      item.order = this.media.indexOf(item);
    }
  });
  
  // Sort media by order
  this.media.sort((a, b) => a.order - b.order);
  
  next();
});

// Validation middleware for media constraints
PostSchema.pre('validate', function (this: IPost, next) {
  // Check total media count
  if (this.media.length > 4) {
    return next(new Error('Maximum 4 media items allowed'));
  }
  
  // Check video duration
  const totalDuration = this.media.reduce((sum, item) => {
    return item.type === 'video' && item.duration ? sum + item.duration : sum;
  }, 0);
  
  if (totalDuration > 120) { // 2 minutes
    return next(new Error('Total video duration cannot exceed 2 minutes'));
  }
  
  next();
});

// Method to reorder media
PostSchema.methods.reorderMedia = function (this: IPost, newOrder: { id: string, order: number }[]) {
  newOrder.forEach(({ id, order }) => {
    const mediaItem = this.media.find(item => item.publicId === id);
    if (mediaItem) {
      mediaItem.order = order;
    }
  });
  
  this.media.sort((a, b) => a.order - b.order);
  return this;
};

const PostModel = mongoose.models.Post as Model<IPost> || mongoose.model<IPost>('Post', PostSchema);

export default PostModel;