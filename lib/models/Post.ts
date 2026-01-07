// lib/models/Post.ts
import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IComment {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  text: string;
  likes: Types.ObjectId[];
  replies: Types.ObjectId[];
  parentComment?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
}

export interface IMedia {
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
}

export interface IPost extends Document {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  media: IMedia[];
  caption: string;
  hashtags: string[];
  mentions: string[];
  likes: Types.ObjectId[];
  comments: IComment[];
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
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  replies: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  parentComment: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const MediaSchema = new Schema<IMedia>({
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
  publicId: {
    type: String,
    required: true
  },
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
});

const PostSchema = new Schema<IPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    media: [MediaSchema],
    caption: {
      type: String,
      required: true,
      maxlength: 2200,
      trim: true
    },
    hashtags: [{
      type: String,
      lowercase: true,
      maxlength: 30,
      trim: true
    }],
    mentions: [{
      type: String,
      trim: true
    }],
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    comments: [CommentSchema],
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
      min: 0,
      max: 100
    },
    location: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true
    },
    style: {
      colors: [String],
      style: [String],
      materials: [String]
    },
    isPublic: {
      type: Boolean,
      default: true,
      index: true
    },
    isSponsored: {
      type: Boolean,
      default: false
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
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
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR']
    },
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
      max: 120
    },
    containsVideo: {
      type: Boolean,
      default: false,
      index: true
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
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret: any) {
        // Convert ObjectId to string
        ret._id = ret._id.toString();
        
        // Convert author
        if (ret.author && ret.author._id) {
          ret.author._id = ret.author._id.toString();
        }
        
        // Convert likes array
        if (ret.likes) {
          ret.likes = ret.likes.map((id: any) => id.toString ? id.toString() : id);
        }
        
        // Convert saves array
        if (ret.saves) {
          ret.saves = ret.saves.map((id: any) => id.toString ? id.toString() : id);
        }
        
        // Handle comments
        if (ret.comments) {
          ret.comments = ret.comments.map((comment: any) => {
            const commentObj = {
              ...comment,
              _id: comment._id ? comment._id.toString() : comment._id,
              user: comment.user ? {
                _id: comment.user._id ? comment.user._id.toString() : comment.user._id,
                username: comment.user.username || '',
                firstName: comment.user.firstName || '',
                lastName: comment.user.lastName || '',
                avatar: comment.user.avatar || '',
                isVerified: comment.user.isVerified || false,
                isPro: comment.user.isPro || false
              } : null,
              likes: comment.likes ? comment.likes.map((id: any) => id.toString ? id.toString() : id) : [],
              parentComment: comment.parentComment ? (comment.parentComment.toString ? comment.parentComment.toString() : comment.parentComment) : null
            };
            return commentObj;
          });
        }
        
        // Add virtual counts
        ret.likesCount = ret.likes ? ret.likes.length : 0;
        ret.savesCount = ret.saves ? ret.saves.length : 0;
        ret.commentsCount = ret.comments ? ret.comments.length : 0;
        ret.hasMultipleMedia = ret.media ? ret.media.length > 1 : false;
        
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// ================== INDEXES ==================
PostSchema.index({ 'hashtags': 1 });
PostSchema.index({ 'mentions': 1 });
PostSchema.index({ 'createdAt': -1 });
PostSchema.index({ 'engagement': -1 });
PostSchema.index({ 'views': -1 });
PostSchema.index({ 'author': 1, 'createdAt': -1 });
PostSchema.index({ 'category': 1 });
PostSchema.index({ 'isPublic': 1, 'isFeatured': 1 });
PostSchema.index({ 'availableForSale': 1, 'price': 1 });

// ================== VIRTUALS ==================
PostSchema.virtual('commentCount').get(function (this: IPost) {
  return this.comments.length;
});

PostSchema.virtual('hasMultipleMedia').get(function (this: IPost) {
  return this.media.length > 1;
});

PostSchema.virtual('likesCount').get(function (this: IPost) {
  return this.likes.length;
});

PostSchema.virtual('savesCount').get(function (this: IPost) {
  return this.saves.length;
});

PostSchema.virtual('hasVideo').get(function (this: IPost) {
  return this.containsVideo;
});

// ================== MIDDLEWARE ==================
PostSchema.pre('save', function (this: IPost, next) {
  this.mediaCount = this.media.length;
  
  // Calculate total duration and check for videos
  this.totalDuration = 0;
  this.containsVideo = false;
  
  this.media.forEach((item, index) => {
    if (item.type === 'video' && item.duration) {
      this.totalDuration += item.duration;
      this.containsVideo = true;
    }
    
    // Set order if not provided
    if (item.order === undefined || item.order === null) {
      item.order = index;
    }
  });
  
  // Sort media by order
  this.media.sort((a, b) => a.order - b.order);
  
  // Update engagement score
  const likesWeight = this.likes.length * 0.5;
  const commentsWeight = this.comments.length * 0.3;
  const savesWeight = this.saves.length * 0.2;
  const viewsWeight = this.views * 0.05;
  
  this.engagement = Math.min(100, likesWeight + commentsWeight + savesWeight + viewsWeight);
  
  next();
});

PostSchema.pre('validate', function (this: IPost, next) {
  // Check total media count
  if (this.media.length > 4) {
    return next(new Error('Maximum 4 media items allowed'));
  }
  
  // Check video duration
  const totalDuration = this.media.reduce((sum, item) => {
    return item.type === 'video' && item.duration ? sum + item.duration : sum;
  }, 0);
  
  if (totalDuration > 120) {
    return next(new Error('Total video duration cannot exceed 2 minutes'));
  }
  
  // Check video count
  const videoCount = this.media.filter(item => item.type === 'video').length;
  if (videoCount > 1) {
    return next(new Error('Only one video allowed per post'));
  }
  
  next();
});

// ================== METHODS ==================
PostSchema.methods.addComment = async function(
  userId: Types.ObjectId, 
  text: string, 
  parentCommentId?: Types.ObjectId
): Promise<IComment> {
  const commentData: any = {
    _id: new Types.ObjectId(),
    user: userId,
    text: text.trim(),
    likes: [],
    replies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false
  };
  
  if (parentCommentId) {
    commentData.parentComment = parentCommentId;
    
    // Find parent comment and add reply
    const parentComment = this.comments.find((c: IComment) => c._id.equals(parentCommentId));
    if (parentComment) {
      parentComment.replies.push(commentData._id);
    }
  }
  
  this.comments.push(commentData);
  await this.save();
  
  return commentData;
};

PostSchema.methods.updateComment = async function(
  commentId: Types.ObjectId, 
  text: string
): Promise<IComment | null> {
  const comment = this.comments.find((c: IComment) => c._id.equals(commentId));
  if (!comment) return null;
  
  comment.text = text.trim();
  comment.isEdited = true;
  comment.updatedAt = new Date();
  
  await this.save();
  return comment;
};

PostSchema.methods.deleteComment = async function(
  commentId: Types.ObjectId
): Promise<boolean> {
  const commentIndex = this.comments.findIndex((c: IComment) => c._id.equals(commentId));
  if (commentIndex === -1) return false;
  
  // Remove from parent's replies if exists
  const comment = this.comments[commentIndex];
  if (comment.parentComment) {
    const parent = this.comments.find((c: IComment) => c._id.equals(comment.parentComment));
    if (parent) {
      parent.replies = parent.replies.filter(
        (replyId: Types.ObjectId) => !replyId.equals(commentId)
      );
    }
  }
  
  // Remove the comment
  this.comments.splice(commentIndex, 1);
  
  await this.save();
  return true;
};

// ================== QUERY MIDDLEWARE ==================
PostSchema.pre(/^find/, function(this: any, next) {
  this.populate({
    path: 'author',
    select: 'username firstName lastName avatar isVerified isPro'
  });
  next();
});

PostSchema.pre(/^find/, function(this: any, next) {
  this.populate({
    path: 'comments.user',
    select: 'username firstName lastName avatar isVerified isPro'
  });
  next();
});

// Define the model
const PostModel = (mongoose.models.Post as Model<IPost>) || mongoose.model<IPost>('Post', PostSchema);

export default PostModel;