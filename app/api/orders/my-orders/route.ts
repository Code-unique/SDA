import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { 'user.clerkId': userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    console.log('Fetching orders for user:', userId, 'with query:', query);

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    console.log(`Found ${orders.length} orders for user ${userId}`);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
    
  } catch (error: any) {
    console.error('Error fetching user orders:', error);
    
    // Check if it's a database connection error
    if (error.name === 'MongoNetworkError' || error.message.includes('connect')) {
      return NextResponse.json(
        { error: 'Database connection failed. Please try again.' },
        { status: 500 }
      );
    }
    
    // Check if it's a model not found error
    if (error.message.includes('model') || error.message.includes('Order')) {
      return NextResponse.json(
        { error: 'Order model not found. Please check database setup.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}