// app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Post from '@/lib/models/Post';
import Course from '@/lib/models/Course';
import "@/lib/loadmodels";
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

    // Verify admin role
    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get date ranges for analytics
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch all analytics data in parallel
    const [
      totalUsers,
      totalPosts,
      totalCourses,
      newUsersThisWeek,
      newUsersThisMonth,
      activeUsersThisWeek,
      popularPosts,
      courseEnrollments,
      userGrowth,
      engagementMetrics
    ] = await Promise.all([
      // Basic counts
      User.countDocuments(),
      Post.countDocuments(),
      Course.countDocuments(),

      // User analytics
      User.countDocuments({ createdAt: { $gte: lastWeek } }),
      User.countDocuments({ createdAt: { $gte: lastMonth } }),
      User.countDocuments({ lastActive: { $gte: lastWeek } }),

      // Content analytics
      Post.find({ isPublic: true })
        .populate('author', 'username')
        .sort({ likes: -1 })
        .limit(10)
        .lean(),

      // Course analytics
      Course.aggregate([
        {
          $project: {
            title: 1,
            totalStudents: 1,
            averageRating: 1,
            enrollmentRate: { $divide: ['$totalStudents', { $max: [1, '$totalStudents'] }] }
          }
        },
        { $sort: { totalStudents: -1 } },
        { $limit: 10 }
      ]),

      // Growth analytics
      User.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        { $limit: 30 }
      ]),

      // Engagement metrics
      Post.aggregate([
        {
          $group: {
            _id: null,
            totalLikes: { $sum: { $size: '$likes' } },
            totalComments: { $sum: { $size: '$comments' } },
            avgLikesPerPost: { $avg: { $size: '$likes' } },
            avgCommentsPerPost: { $avg: { $size: '$comments' } }
          }
        }
      ])
    ]);

    // Calculate engagement rate safely
    const engagementRate = totalUsers > 0 
      ? ((activeUsersThisWeek / totalUsers) * 100).toFixed(1)
      : '0.0';

    const analytics = {
      overview: {
        totalUsers,
        totalPosts,
        totalCourses,
        newUsersThisWeek,
        newUsersThisMonth,
        activeUsersThisWeek,
        engagementRate
      },
      growth: userGrowth.map((item: any) => ({
        date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
        users: item.count
      })),
      popularContent: {
        posts: popularPosts.map((post: any) => ({
          id: post._id.toString(),
          title: post.caption?.substring(0, 50) + (post.caption?.length > 50 ? '...' : '') || 'Untitled Post',
          author: post.author?.username || 'Unknown',
          likes: post.likes?.length || 0,
          comments: post.comments?.length || 0
        })),
        courses: courseEnrollments.map((course: any) => ({
          ...course,
          _id: course._id?.toString()
        }))
      },
      engagement: engagementMetrics[0] || {
        totalLikes: 0,
        totalComments: 0,
        avgLikesPerPost: 0,
        avgCommentsPerPost: 0
      }
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}