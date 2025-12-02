// lib/services/post-service.ts
import Post from '@/lib/models/Post';
import User from '@/lib/models/User';
import { Types } from 'mongoose';

export class PostService {
  static async createPost(authorId: string, postData: any) {
    const post = await Post.create({
      author: authorId,
      ...postData,
    });

    await post.populate('author', 'username firstName lastName avatar');

    return post;
  }

  static async getUserFeed(userId: any, page: number = 1, limit: number = 10) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Get posts from users you follow + your own posts
    const followingIds = [...user.following, userId];

    const [posts, total] = await Promise.all([
      Post.find({
        author: { $in: followingIds },
        isPublic: true
      })
        .populate('author', 'username firstName lastName avatar')
        .populate('comments.user', 'username firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments({
        author: { $in: followingIds },
        isPublic: true
      })
    ]);

    return {
      posts: posts.map(post => ({
        ...post,
        _id: post._id.toString(),
        author: post.author ? {
          ...post.author,
          _id: post.author._id.toString()
        } : null,
        comments: post.comments.map(comment => ({
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

    const likeIndex = post.likes.findIndex(id => id.equals(userObjectId));

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(userObjectId);
    }

    await post.save();
    await post.populate('author', 'username firstName lastName avatar');
    await post.populate('comments.user', 'username firstName lastName avatar');

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
    await post.populate('author', 'username firstName lastName avatar');
    await post.populate('comments.user', 'username firstName lastName avatar');

    return post;
  }

  static async getPostsByUser(userId: string, page: number = 1, limit: number = 10) {
    const [posts, total] = await Promise.all([
      Post.find({ author: userId, isPublic: true })
        .populate('author', 'username firstName lastName avatar')
        .populate('comments.user', 'username firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments({ author: userId, isPublic: true })
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

    if (filters.hashtags && filters.hashtags.length > 0) {
      query.hashtags = { $in: filters.hashtags };
    }

    if (filters.userId) {
      query.author = filters.userId;
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'username firstName lastName avatar')
        .populate('comments.user', 'username firstName lastName avatar')
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
}