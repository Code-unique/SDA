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
    const key = searchParams.get('key');
    const url = searchParams.get('url');
    
    if (!key && !url) {
      return NextResponse.json(
        { error: 'Either key or url parameter is required' },
        { status: 400 }
      );
    }
    
    let query: any = {};
    
    if (key) {
      query['video.key'] = key;
    } else if (url) {
      query['video.url'] = url;
    }
    
    console.log('🔍 Searching for video:', query);
    
    const video = await VideoLibrary.findOne(query)
      .populate('uploadedBy', 'firstName lastName username avatar email');
    
    if (!video) {
      return NextResponse.json(
        { error: 'Video not found in library' },
        { status: 404 }
      );
    }
    
    // Convert to plain object and add formatted fields
    const videoObj = video.toObject();
    
    return NextResponse.json({
      video: {
        ...videoObj,
        formattedSize: formatFileSize(videoObj.video.size),
        formattedDuration: formatDuration(videoObj.video.duration || 0)
      }
    });
    
  } catch (error: any) {
    console.error('Error searching video:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}