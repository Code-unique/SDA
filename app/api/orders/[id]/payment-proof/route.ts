// app/api/orders/[id]/payment-proof/route.ts - FIXED TYPE ERROR
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import cloudinary from '@/lib/cloudinary';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {  // Add explicit return type
  try {
    await connectToDatabase();
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    console.log('Uploading payment proof for order:', { id, userId });
    
    // Find the order
    const order = await Order.findOne({
      _id: id,
      'user.clerkId': userId
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if payment method requires screenshot
    if (order.paymentMethod !== 'bank_transfer') {
      return NextResponse.json(
        { error: 'Payment proof only required for bank transfer orders' },
        { status: 400 }
      );
    }

    // Check if already uploaded
    if (order.paymentScreenshot?.url) {
      return NextResponse.json(
        { error: 'Payment proof already uploaded' },
        { status: 400 }
      );
    }

    // Check order status
    if (order.status !== 'pending' && order.status !== 'payment_verification') {
      return NextResponse.json(
        { error: 'Cannot upload payment proof for order in current status' },
        { status: 400 }
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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, JPG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary and return a Promise
    return new Promise<NextResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `payment-proofs/order-${order.orderNumber}`,
          public_id: `payment_${order.orderNumber}_${Date.now()}`,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        },
        async (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(
              NextResponse.json(
                { error: 'Failed to upload image to Cloudinary' },
                { status: 500 }
              )
            );
          } else if (result) {
            try {
              // Update order with payment screenshot
              order.paymentScreenshot = {
                publicId: result.public_id,
                url: result.secure_url,
                uploadedAt: new Date()
              };
              
              // Update order status to payment_verification
              order.status = 'payment_verification';
              
              await order.save();

              console.log('Payment proof uploaded successfully for order:', order.orderNumber);
              
              resolve(
                NextResponse.json({
                  success: true,
                  message: 'Payment proof uploaded successfully',
                  paymentScreenshot: order.paymentScreenshot,
                  orderStatus: order.status,
                  orderNumber: order.orderNumber
                })
              );
            } catch (dbError: any) {
              console.error('Database update error:', dbError);
              reject(
                NextResponse.json(
                  { error: 'Failed to update order in database' },
                  { status: 500 }
                )
              );
            }
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error: any) {
    console.error('Payment proof upload error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}