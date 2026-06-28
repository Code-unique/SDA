//sutra/lib/services/post-service.ts
import Post from '@/lib/models/Post';
import User from '@/lib/models/User';
import { Types } from 'mongoose';

export class PostService {
  static async createPost(authorId: string, postData: any) {
    // Validate media constraints
    if (postData.media && postData.media.length > 4) {
      throw new Error('Maximum 4 media items allowed');
    }

    // Calculate total video duration
    const videoDuration = postData.media.reduce((total: number, media: any) => {
      return media.type === 'video' ? total + (media.duration || 0) : total;
    }, 0);

    if (videoDuration > 120) { // 2 minutes
      throw new Error('Total video duration cannot exceed 2 minutes');
    }

    // Check video count
    const videoCount = postData.media.filter((media: any) => media.type === 'video').length;
    if (videoCount > 1) {
      throw new Error('Only one video allowed per post');
    }

    const post = await Post.create({
      author: authorId,
      ...postData,
    });

    await post.populate('author', 'username firstName lastName avatar');
    
    // Calculate media metadata
    await post.save(); // This will trigger pre-save middleware

    return post;
  }

  static async getUserFeed(userId: any, page: number = 1, limit: number = 10, filters: any = {}) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const followingIds = [...user.following, userId];
    
    const query: any = {
      author: { $in: followingIds },
      isPublic: true
    };

    // Apply filters
    if (filters.mediaType) {
      if (filters.mediaType === 'image') {
        query.containsVideo = false;
      } else if (filters.mediaType === 'video') {
        query.containsVideo = true;
      }
    }

    if (filters.hashtags && filters.hashtags.length > 0) {
      query.hashtags = { $in: filters.hashtags.map((tag: string) => tag.toLowerCase()) };
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'username firstName lastName avatar isVerified isPro')
        .populate({
          path: 'comments.user',
          select: 'username firstName lastName avatar isVerified'
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(query)
    ]);

    return {
      posts: posts.map(post => ({
        ...post,
        _id: post._id.toString(),
        author: post.author ? {
          ...post.author,
          _id: post.author._id.toString()
        } : null,
        comments: (post.comments || []).map((comment: any) => ({
          ...comment,
          _id: comment._id.toString(),
          user: comment.user ? {
            ...comment.user,
            _id: comment.user._id.toString()
          } : null
        }))
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async likePost(postId: string, userId: string) {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');

    const userObjectId = new Types.ObjectId(userId);
    const likeIndex = post.likes.findIndex((id: Types.ObjectId) => id.equals(userObjectId));

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(userObjectId);
    }

    await post.save();
    await this.populatePost(post);
    return post;
  }

  static async addComment(postId: string, userId: string, text: string) {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');

    const userObjectId = new Types.ObjectId(userId);

    post.comments.push({
      _id: new Types.ObjectId(),
      user: userObjectId,
      text: text.substring(0, 1000),
      likes: [],
      replies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false,
    });

    await post.save();
    await this.populatePost(post);
    return post;
  }

  static async getPostsByUser(userId: string, page: number = 1, limit: number = 10, filters: any = {}) {
    const query: any = { author: userId, isPublic: true };

    if (filters.mediaType) {
      if (filters.mediaType === 'image') {
        query.containsVideo = false;
      } else if (filters.mediaType === 'video') {
        query.containsVideo = true;
      }
    }

    if (filters.hashtags && filters.hashtags.length > 0) {
      query.hashtags = { $in: filters.hashtags.map((tag: string) => tag.toLowerCase()) };
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'username firstName lastName avatar isVerified isPro')
        .populate({
          path: 'comments.user',
          select: 'username firstName lastName avatar isVerified'
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(query)
    ]);

    return {
      posts: posts.map(post => ({
        ...post,
        _id: post._id.toString(),
        author: post.author ? {
          ...post.author,
          _id: post.author._id.toString()
        } : null
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async explorePosts(page: number = 1, limit: number = 10, filters: any = {}) {
    const query: any = { isPublic: true };

    // Apply filters
    if (filters.mediaType) {
      if (filters.mediaType === 'image') {
        query.containsVideo = false;
      } else if (filters.mediaType === 'video') {
        query.containsVideo = true;
      }
    }

    if (filters.hashtags && filters.hashtags.length > 0) {
      query.hashtags = { $in: filters.hashtags.map((tag: string) => tag.toLowerCase()) };
    }

    if (filters.userId) {
      query.author = filters.userId;
    }

    // Sort by engagement or recency
    const sort: any = {};
    if (filters.sort === 'popular') {
      sort.engagement = -1;
    } else {
      sort.createdAt = -1;
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'username firstName lastName avatar isVerified isPro followers following')
        .populate({
          path: 'comments.user',
          select: 'username firstName lastName avatar isVerified'
        })
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(query)
    ]);

    return {
      posts: posts.map(post => ({
        ...post,
        _id: post._id.toString(),
        author: post.author ? {
          ...post.author,
          _id: post.author._id.toString(),
          followers: Array.isArray((post.author as any).followers) ? (post.author as any).followers.length : 0,
          following: Array.isArray((post.author as any).following) ? (post.author as any).following.length : 0
        } : null
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async updatePostMedia(postId: string, mediaUpdates: any) {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');

    // Update media items
    if (mediaUpdates.order) {
      // Check if reorderMedia method exists, if not implement it inline
      const mediaItems = [...post.media];
      mediaUpdates.order.forEach((publicId: string, newIndex: number) => {
        const oldIndex = mediaItems.findIndex(item => item.publicId === publicId);
        if (oldIndex !== -1) {
          const [item] = mediaItems.splice(oldIndex, 1);
          mediaItems.splice(newIndex, 0, item);
        }
      });
      
      // Update order numbers
      mediaItems.forEach((item, index) => {
        item.order = index;
      });
      
      post.media = mediaItems;
    }

    // Add new media
    if (mediaUpdates.add) {
      // Validate before adding
      if (post.media.length + mediaUpdates.add.length > 4) {
        throw new Error('Maximum 4 media items allowed');
      }
      
      post.media.push(...mediaUpdates.add.map((media: any, index: number) => ({
        ...media,
        order: post.media.length + index
      })));
    }

    // Remove media
    if (mediaUpdates.remove) {
      post.media = post.media.filter(media => 
        !mediaUpdates.remove.includes(media.publicId)
      );
    }

    await post.save();
    await this.populatePost(post);
    return post;
  }

  static async getPostStats(postId: string) {
    const post = await Post.findById(postId)
      .populate('author', 'username firstName lastName avatar')
      .lean();

    if (!post) throw new Error('Post not found');

    // Type assertion for post
    const postData = post as any;
    
    const stats = {
      totalLikes: postData.likes.length,
      totalComments: postData.comments.length,
      totalSaves: postData.saves.length,
      views: postData.views || 0,
      engagement: postData.engagement || 0,
      mediaCount: postData.media.length,
      videoDuration: postData.media.reduce((total: number, media: any) => 
        media.type === 'video' ? total + (media.duration || 0) : total, 0
      ),
      hasMultipleMedia: postData.media.length > 1,
      containsVideo: postData.media.some((media: any) => media.type === 'video')
    };

    return {
      ...postData,
      _id: postData._id.toString(),
      author: postData.author ? {
        ...postData.author,
        _id: postData.author._id.toString()
      } : null,
      stats
    };
  }

  private static async populatePost(post: any) {
    await post.populate('author', 'username firstName lastName avatar isVerified isPro');
    await post.populate({
      path: 'comments.user',
      select: 'username firstName lastName avatar isVerified'
    });
  }
}