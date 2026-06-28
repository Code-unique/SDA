import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import VideoLibrary from '@/lib/models/VideoLibrary';
import "@/lib/loadmodels";

// DELETE - Bulk delete videos from library
export async function DELETE(request: NextRequest) {
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
    const { videoIds } = body;
    
    if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
      return NextResponse.json(
        { error: 'Video IDs array is required' },
        { status: 400 }
      );
    }

    console.log('🗑️ Bulk deleting videos:', videoIds);

    // Validate video IDs
    const validVideoIds = videoIds.filter((id: string) => {
      try {
        return id && typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
      } catch {
        return false;
      }
    });

    if (validVideoIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid video IDs provided' },
        { status: 400 }
      );
    }

    // Find videos to delete with usage count check
    const videosToDelete = await VideoLibrary.find({
      _id: { $in: validVideoIds }
    }, { 
      'video.key': 1, 
      title: 1, 
      usageCount: 1,
      courses: 1 
    }).lean();

    if (videosToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No videos found with the provided IDs' },
        { status: 404 }
      );
    }

    // Check if any videos are in use (optional safety check)
    const videosInUse = videosToDelete.filter((video: any) => video.usageCount > 0);
    
    if (videosInUse.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Some videos are in use and cannot be deleted',
        videosInUse: videosInUse.map((video: any) => ({
          id: video._id.toString(),
          title: video.title,
          usageCount: video.usageCount,
          courses: video.courses || []
        })),
        canForceDelete: false // Set to true if you want to allow force delete
      }, { status: 400 });
    }

    // Delete from database
    const deleteResult = await VideoLibrary.deleteMany({
      _id: { $in: validVideoIds }
    });

    console.log(`✅ Bulk delete completed: ${deleteResult.deletedCount} videos deleted`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} videos`,
      deletedCount: deleteResult.deletedCount,
      deletedVideos: videosToDelete.map((video: any) => ({
        id: video._id.toString(),
        title: video.title
      }))
    });

  } catch (error: any) {
    console.error('❌ Error in bulk delete:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Optional: POST method for bulk actions if needed
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, videoIds, data } = body;

    if (!action || !videoIds || !Array.isArray(videoIds)) {
      return NextResponse.json(
        { error: 'Action and video IDs are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'updateCategories':
        // Bulk update categories
        if (!data?.categories || !Array.isArray(data.categories)) {
          return NextResponse.json(
            { error: 'Categories array is required' },
            { status: 400 }
          );
        }

        const updateResult = await VideoLibrary.updateMany(
          { _id: { $in: videoIds } },
          { $set: { categories: data.categories } }
        );

        return NextResponse.json({
          success: true,
          message: `Updated ${updateResult.modifiedCount} videos`,
          modifiedCount: updateResult.modifiedCount
        });

      case 'updateTags':
        // Bulk update tags
        if (!data?.tags || !Array.isArray(data.tags)) {
          return NextResponse.json(
            { error: 'Tags array is required' },
            { status: 400 }
          );
        }

        const tagsResult = await VideoLibrary.updateMany(
          { _id: { $in: videoIds } },
          { $set: { tags: data.tags } }
        );

        return NextResponse.json({
          success: true,
          message: `Updated ${tagsResult.modifiedCount} videos`,
          modifiedCount: tagsResult.modifiedCount
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('❌ Error in bulk action:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}