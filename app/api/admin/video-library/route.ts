import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import VideoLibrary from '@/lib/models/VideoLibrary';
import "@/lib/loadmodels";

// Helper functions
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// GET - Get video library with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const sortBy = searchParams.get('sortBy') || 'uploadDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const showOnlyMine = searchParams.get('showOnlyMine') === 'true';
    const type = searchParams.get('type') || 'all';
    
    console.log('🔍 Fetching video library with params:', {
      page,
      limit,
      search,
      categories,
      sortBy,
      sortOrder,
      showOnlyMine,
      type
    });

    const skip = (page - 1) * limit;
    
    // Build query
    const query: any = {};
    
    // Text search
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { tags: { $regex: search.trim(), $options: 'i' } },
        { 'video.originalFileName': { $regex: search.trim(), $options: 'i' } }
      ];
    }
    
    // Category filter
    if (categories.length > 0) {
      query.categories = { $in: categories };
    }
    
    // Show only mine filter
    if (showOnlyMine) {
      query.uploadedBy = adminUser._id;
    }
    
    // Type filter
    if (type !== 'all') {
      if (type === 'lesson') {
        query.categories = { $in: ['lessonVideo', 'lesson'] };
      } else if (type === 'preview') {
        query.categories = { $in: ['previewVideo', 'preview'] };
      }
    }
    
    console.log('📋 Final query:', JSON.stringify(query, null, 2));
    
    // Build sort options
    const sortOptions: any = {};
    if (sortBy === 'uploadDate') {
      sortOptions.uploadDate = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'title') {
      sortOptions.title = sortOrder === 'desc' ? 1 : -1;
    } else if (sortBy === 'size') {
      sortOptions['video.size'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'duration') {
      sortOptions['video.duration'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'usage') {
      sortOptions.usageCount = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.uploadDate = -1; // Default sort
    }
    
    // Execute query
    const [videos, total] = await Promise.all([
      VideoLibrary.find(query)
        .populate('uploadedBy', 'firstName lastName username avatar email')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      VideoLibrary.countDocuments(query)
    ]);
    
    console.log(`✅ Found ${videos.length} videos (total matching: ${total})`);
    
    // Get unique categories for filter options
    const allCategories = await VideoLibrary.distinct('categories');
    
    // Get usage statistics
    const totalVideos = await VideoLibrary.countDocuments({});
    const totalSizeResult = await VideoLibrary.aggregate([
      { $group: { _id: null, totalSize: { $sum: '$video.size' } } }
    ]);
    const usageStatsResult = await VideoLibrary.aggregate([
      { $group: { 
        _id: null, 
        totalUsage: { $sum: '$usageCount' },
        avgUsage: { $avg: '$usageCount' }
      } }
    ]);
    
    const totalSize = totalSizeResult[0]?.totalSize || 0;
    const usageStats = usageStatsResult[0] || { totalUsage: 0, avgUsage: 0 };
    
    // Format the videos
    const formattedVideos = videos.map(video => {
      const videoObj = video as any;
      return {
        ...videoObj,
        _id: videoObj._id.toString(),
        formattedSize: formatFileSize(videoObj.video.size || 0),
        formattedDuration: formatDuration(videoObj.video.duration || 0),
        uploadedBy: videoObj.uploadedBy ? {
          _id: videoObj.uploadedBy._id?.toString(),
          firstName: videoObj.uploadedBy.firstName,
          lastName: videoObj.uploadedBy.lastName,
          username: videoObj.uploadedBy.username,
          avatar: videoObj.uploadedBy.avatar,
          email: videoObj.uploadedBy.email
        } : null,
        // Handle courses array
        courses: (videoObj.courses || []).map((course: any) => ({
          courseId: course.courseId?.toString() === '000000000000000000000000' ? 'preview' : course.courseId?.toString(),
          courseTitle: course.courseTitle,
          moduleId: course.moduleId?.toString(),
          chapterId: course.chapterId?.toString(),
          lessonId: course.lessonId?.toString(),
          usedAt: course.usedAt
        })),
        previews: videoObj.previews || [],
        uploadDate: videoObj.uploadDate,
        categories: videoObj.categories || [],
        tags: videoObj.tags || []
      };
    });
    
    return NextResponse.json({
      videos: formattedVideos,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      filters: {
        categories: allCategories.filter(Boolean),
        totalVideos,
        totalSize,
        formattedTotalSize: formatFileSize(totalSize),
        usageStats: {
          totalUsage: usageStats.totalUsage,
          avgUsage: Math.round(usageStats.avgUsage * 10) / 10
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching video library:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Add video to library
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    console.log('📥 Received video library POST request:', {
      title: body.title,
      videoKey: body.video?.key,
      categories: body.categories
    });
    
    // Validate required fields
    if (!body.video || !body.video.key || !body.video.url || body.video.size === undefined) {
      console.log('❌ Missing video data:', body.video);
      return NextResponse.json(
        { error: 'Video data is required (key, url, and size)' },
        { status: 400 }
      );
    }
    
    if (!body.title) {
      console.log('❌ Missing title');
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    // Check if video already exists in library
    const existingVideo = await VideoLibrary.findOne({
      'video.key': body.video.key
    });
    
    if (existingVideo) {
      console.log('✅ Video already exists in library:', existingVideo.title);
      
      // If this was from a course upload, add usage record
      if (body.courseId && body.courseTitle) {
        try {
          await (existingVideo as any).addUsage(
            body.courseId,
            body.courseTitle,
            body.moduleId,
            body.chapterId,
            body.lessonId
          );
          console.log('📈 Added usage record for existing video');
        } catch (usageError) {
          console.warn('⚠️ Failed to add usage record:', usageError);
        }
      }
      
      // Populate uploadedBy for response
      await existingVideo.populate('uploadedBy', 'firstName lastName username avatar email');
      
      const videoObj = existingVideo.toObject() as any;
      return NextResponse.json(
        { 
          success: true,
          message: 'Video already exists in library',
          video: {
            ...videoObj,
            _id: videoObj._id.toString(),
            formattedSize: formatFileSize(videoObj.video.size || 0),
            formattedDuration: formatDuration(videoObj.video.duration || 0)
          },
          existing: true
        },
        { status: 200 }
      );
    }
    
    console.log('📝 Creating new video library entry...');
    
    // Create video library entry
    const videoEntry = await VideoLibrary.create({
      title: body.title.substring(0, 200),
      description: body.description?.substring(0, 1000) || '',
      video: {
        key: body.video.key,
        url: body.video.url,
        size: body.video.size,
        type: 'video' as const,
        duration: body.video.duration || 0,
        width: body.video.width,
        height: body.video.height,
        originalFileName: body.originalFileName || body.video.key.split('/').pop() || 'unknown',
        mimeType: body.mimeType || body.video.mimeType || 'video/mp4'
      },
      uploadedBy: adminUser._id,
      categories: (body.categories || []).slice(0, 10).filter(Boolean),
      tags: (body.tags || []).slice(0, 20).filter(Boolean),
      metadata: body.metadata || {},
      isPublic: body.isPublic !== false
    });
    
    console.log('✅ Video library entry created:', {
      id: videoEntry._id,
      title: videoEntry.title,
      key: videoEntry.video.key
    });
    
    // If this was from a course upload, add initial usage
    if (body.courseId && body.courseTitle) {
      try {
        await (videoEntry as any).addUsage(
          body.courseId,
          body.courseTitle,
          body.moduleId,
          body.chapterId,
          body.lessonId
        );
        console.log('📈 Added initial usage record');
      } catch (usageError) {
        console.warn('⚠️ Failed to add initial usage record:', usageError);
      }
    }
    
    // Populate uploadedBy for response
    await videoEntry.populate('uploadedBy', 'firstName lastName username avatar email');
    
    const videoObj = videoEntry.toObject() as any;
    return NextResponse.json({
      success: true,
      message: 'Video added to library successfully',
      video: {
        ...videoObj,
        _id: videoObj._id.toString(),
        formattedSize: formatFileSize(videoObj.video.size || 0),
        formattedDuration: formatDuration(videoObj.video.duration || 0)
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error adding video to library:', error);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}