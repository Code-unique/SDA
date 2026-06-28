// app/api/admin/orders/[id]/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import User from '@/lib/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const dbUser = await User.findOne({ clerkId: userId });
    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id } = await params;
    
    // Find the order
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Transform the order for response with safe property access
    const orderResponse = {
      _id: order._id?.toString() || id,
      orderNumber: order.orderNumber,
      items: order.items || [],
      shippingAddress: order.shippingAddress || {
        fullName: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        phone: ''
      },
      user: order.user || {
        clerkId: '',
        email: '',
        name: '',
        phone: ''
      },
      subtotal: order.subtotal || 0,
      shippingFee: order.shippingFee || 0,
      tax: order.tax || 0,
      total: order.total || 0,
      status: order.status || 'pending',
      paymentMethod: order.paymentMethod || 'bank_transfer',
      paymentVerified: order.paymentVerified || false,
      paymentScreenshot: order.paymentScreenshot || null,
      trackingNumber: order.trackingNumber || '',
      adminNotes: order.adminNotes || '',
      createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: order.updatedAt?.toISOString() || new Date().toISOString()
    };

    return NextResponse.json(orderResponse);
  } catch (error: any) {
    console.error('GET admin order error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const dbUser = await User.findOne({ clerkId: userId });
    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    // Find the order
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update allowed fields
    const allowedUpdates = ['status', 'paymentVerified', 'trackingNumber', 'adminNotes'];
    
    for (const key in body) {
      if (allowedUpdates.includes(key)) {
        (order as any)[key] = body[key];
      }
    }

    // Add to admin notes if status changed
    if (body.status && body.status !== order.status) {
      const noteText = `[${new Date().toISOString()}] Status changed from ${order.status} to ${body.status} by admin`;
      order.adminNotes = order.adminNotes ? `${order.adminNotes}\n${noteText}` : noteText;
    }

    // Add to admin notes if payment verified
    if (body.paymentVerified === true && !order.paymentVerified) {
      const noteText = `[${new Date().toISOString()}] Payment verified by admin`;
      order.adminNotes = order.adminNotes ? `${order.adminNotes}\n${noteText}` : noteText;
    }

    await order.save();
    
    // Return updated order with safe property access
    const orderResponse = {
      _id: order._id?.toString() || id,
      orderNumber: order.orderNumber,
      items: order.items || [],
      shippingAddress: order.shippingAddress || {
        fullName: '',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        phone: ''
      },
      user: order.user || {
        clerkId: '',
        email: '',
        name: '',
        phone: ''
      },
      subtotal: order.subtotal || 0,
      shippingFee: order.shippingFee || 0,
      tax: order.tax || 0,
      total: order.total || 0,
      status: order.status || 'pending',
      paymentMethod: order.paymentMethod || 'bank_transfer',
      paymentVerified: order.paymentVerified || false,
      paymentScreenshot: order.paymentScreenshot || null,
      trackingNumber: order.trackingNumber || '',
      adminNotes: order.adminNotes || '',
      createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: order.updatedAt?.toISOString() || new Date().toISOString()
    };

    return NextResponse.json(orderResponse);
  } catch (error: any) {
    console.error('PUT admin order error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}