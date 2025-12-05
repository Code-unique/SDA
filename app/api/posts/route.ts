// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import cloudinary from '@/lib/cloudinary';

// ----------------------------------------------
// CLOUDINARY UPLOAD HELPER
// ----------------------------------------------
async function uploadToCloudinary(buffer: Buffer): Promise<any> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'sutra_posts' },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}
// ----------------------------------------------
// GET — Fetch explore posts (Updated with comment population)
// ----------------------------------------------
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const sort = searchParams.get('sort') || 'recent'
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const filters = searchParams.get('filters')
    
    const skip = (page - 1) * limit
    
    // Build query
    const query: any = {}
    
    // Search filter
    if (search) {
      query.$or = [
        { caption: { $regex: search, $options: 'i' } },
        { hashtags: { $in: [new RegExp(search, 'i')] } },
        { 'author.username': { $regex: search, $options: 'i' } },
        { 'author.firstName': { $regex: search, $options: 'i' } },
        { 'author.lastName': { $regex: search, $options: 'i' } }
      ]
    }
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category
    }
    
    // Additional filters
    if (filters) {
      const filterArray = filters.split(',')
      const filterQuery: any = {}
      
      filterArray.forEach((filter: string) => {
        if (filter === 'video') {
          filterQuery['media.type'] = 'video'
        } else if (filter === 'image') {
          filterQuery['media.type'] = 'image'
        } else if (filter === 'ai') {
          filterQuery.aiGenerated = true
        } else if (filter === 'collaboration') {
          filterQuery.collaboration = true
        } else if (filter === 'forsale') {
          filterQuery.availableForSale = true
        } else if (filter === 'featured') {
          filterQuery.isFeatured = true
        } else if (filter === 'trending') {
          // Posts with high engagement in last 7 days
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          filterQuery.createdAt = { $gte: sevenDaysAgo }
          filterQuery['$expr'] = { 
            $gte: [
              { $size: '$likes' },
              50
            ]
          }
        }
      })
      
      if (Object.keys(filterQuery).length > 0) {
        Object.assign(query, filterQuery)
      }
    }
    
    // Build sort
    let sortOptions: any = { createdAt: -1 } // Default: recent
    
    if (sort === 'popular') {
      sortOptions = { 
        $sortByCount: { $size: '$likes' }, 
        createdAt: -1 
      }
    } else if (sort === 'trending') {
      // Trending: high engagement in last 3 days
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      query.createdAt = { $gte: threeDaysAgo }
      sortOptions = { 
        $sortByCount: { 
          $add: [
            { $size: '$likes' },
            { $multiply: [{ $size: '$comments' }, 2] },
            { $ifNull: ['$shares', 0] }
          ]
        }, 
        createdAt: -1 
      }
    }
    
    // Get posts with populated author AND comments
    const posts = await Post.find(query)
      .populate({
        path: 'author',
        model: User,
        select: '_id username firstName lastName avatar isVerified isPro role'
      })
      .populate({
        path: 'comments.user',
        model: User,
        select: '_id username firstName lastName avatar isVerified'
      })
      .sort(sort === 'trending' ? { likes: -1, comments: -1, createdAt: -1 } : sortOptions)
      .skip(skip)
      .limit(limit)
      .lean()
    
    // Also populate likes and saves for better initial state
    const enhancedPosts = posts.map(post => {
      // Transform comments to ensure user object is properly structured
      const enhancedComments = post.comments?.map((comment: any) => ({
        ...comment,
        user: comment.user || null // Ensure user is never undefined
      })) || []
      
      return {
        ...post,
        comments: enhancedComments
      }
    })
    
    // Get total count for pagination
    const totalPosts = await Post.countDocuments(query)
    const totalPages = Math.ceil(totalPosts / limit)
    
    return NextResponse.json({
      success: true,
      posts: enhancedPosts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    })
    
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}
// ----------------------------------------------
// POST — Create a new post with image upload
// ----------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const dbUser = await User.findOne({ clerkId: userId });
    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const caption = formData.get('caption') as string;
    const hashtagsString = formData.get('hashtags') as string;
    const imageFiles = formData.getAll('images') as File[]; // Changed from Blob[] to File[]

    if (!caption || caption.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Caption is required' },
        { status: 400 }
      );
    }

    if (caption.length > 2200) {
      return NextResponse.json(
        { success: false, error: 'Caption too long (max 2200 characters)' },
        { status: 400 }
      );
    }

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one image is required' },
        { status: 400 }
      );
    }

    if (imageFiles.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 images allowed' },
        { status: 400 }
      );
    }

    // Preserve original file size limits for posts
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (original limit for posts)
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    for (const file of imageFiles) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File ${(file as File).name} exceeds 10MB size limit` },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `File ${(file as File).name} has invalid type. Allowed: JPEG, PNG, GIF, WebP` },
          { status: 400 }
        );
      }
    }

    // Upload all images to Cloudinary (preserve original pattern)
    const uploadedImages = [];

    for (const file of imageFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadToCloudinary(buffer);

      uploadedImages.push({
        type: 'image',
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        width: uploaded.width,
        height: uploaded.height
      });
    }

    // Parse and validate hashtags (preserve original pattern)
    let hashtags: string[] = []; // Explicitly typed as string[]
    if (hashtagsString) {
      try {
        const parsed = JSON.parse(hashtagsString);
        if (Array.isArray(parsed)) {
          hashtags = parsed
            .filter((tag: any) => typeof tag === 'string' && tag.length > 0)
            .map((tag: string) => tag.toLowerCase().substring(0, 30))
            .slice(0, 30);
        }
      } catch (e) {
        console.error('Error parsing hashtags:', e);
      }
    }

    const post = await Post.create({
      author: dbUser._id,
      media: uploadedImages,
      caption: caption.substring(0, 2200),
      hashtags,
      likes: [],
      saves: [],
      comments: [],
      views: 0,
      shares: 0,
      engagement: 0,
      isPublic: true,
    });

    await post.populate('author', 'username firstName lastName avatar isVerified isPro');

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}