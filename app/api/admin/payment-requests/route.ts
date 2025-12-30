import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import PaymentRequest from '@/lib/models/PaymentRequest';
import Course from '@/lib/models/Course';
import "@/lib/loadmodels";

// GET - List payment requests with filters
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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    let query: any = {};

    if (status !== 'all') {
      query.status = status;
    }

    if (search) {
      // Search by user email, name, or course title
      const users = await User.find({
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const userIds = users.map(u => u._id);

      const courses = await Course.find({
        title: { $regex: search, $options: 'i' }
      }).select('_id');

      const courseIds = courses.map(c => c._id);

      query.$or = [
        { userId: { $in: userIds } },
        { courseId: { $in: courseIds } },
        { transactionId: { $regex: search, $options: 'i' } }
      ];
    }

    const [requests, total] = await Promise.all([
      PaymentRequest.find(query)
        .populate('userId', 'firstName lastName email username avatar clerkId')
        .populate('courseId', 'title slug price thumbnail')
        .populate('approvedBy', 'firstName lastName username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentRequest.countDocuments(query)
    ]);

    // Get counts by status
    const counts = await PaymentRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts: Record<string, number> = {};
    counts.forEach(item => {
      statusCounts[item._id] = item.count;
    });

    return NextResponse.json({
      requests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      stats: {
        total,
        ...statusCounts
      }
    });

  } catch (error: any) {
    console.error('Error fetching payment requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}