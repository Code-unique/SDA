import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';

// POST upload payment proof
export async function POST(
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
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    const order = await Order.findById(id);
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    if (order.user.clerkId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (order.paymentMethod !== 'bank_transfer') {
      return NextResponse.json(
        { error: 'Payment proof only required for bank transfer' },
        { status: 400 }
      );
    }
    
    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Image}`;
    
    order.paymentScreenshot = dataUrl;
    order.status = 'payment_verification';
    await order.save();
    
    return NextResponse.json({ 
      message: 'Payment proof uploaded successfully',
      order 
    });
  } catch (error) {
    console.error('Upload payment proof error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}