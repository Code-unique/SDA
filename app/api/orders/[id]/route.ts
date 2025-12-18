import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { isUserAdmin } from '@/lib/utils/role-check';

// GET order by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const order = await Order.findById(id);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns order or is admin
    const isAdmin = await isUserAdmin();
    if (order.user.clerkId !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(order);
  } catch (error) {
    console.error('GET order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update order (admin only for status updates)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const order = await Order.findById(id);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Update allowed fields for admin
    const allowedUpdates = [
      'status',
      'paymentVerified',
      'trackingNumber',
      'adminNotes',
      'estimatedDelivery',
      'deliveredAt',
    ];
    
    allowedUpdates.forEach(field => {
      if (body[field] !== undefined) {
        (order as any)[field] = body[field];
      }
    });
    
    await order.save();
    
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('PUT order error:', error);
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}