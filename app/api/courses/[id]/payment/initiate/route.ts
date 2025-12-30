import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Course from '@/lib/models/Course';
import PaymentRequest from '@/lib/models/PaymentRequest';
import "@/lib/loadmodels";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const currentUserDoc = await User.findOne({ clerkId: user.id });
    if (!currentUserDoc) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    // Validate required fields
    const { paymentMethod, transactionId, paymentProof } = body;
    
    if (!paymentMethod || !['bank_transfer', 'digital_wallet', 'cash', 'other'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Valid payment method is required' },
        { status: 400 }
      );
    }

    // Find course
    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    if (!course.isPublished) {
      return NextResponse.json(
        { error: 'Course is not available' },
        { status: 403 }
      );
    }

    // Check if user is already enrolled
    const isAlreadyEnrolled = course.students.some(
      (student: any) => student.user.toString() === currentUserDoc._id.toString()
    );

    if (isAlreadyEnrolled) {
      return NextResponse.json(
        { error: 'Already enrolled in this course' },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const existingRequest = await PaymentRequest.findOne({
      userId: currentUserDoc._id,
      courseId: course._id,
      status: 'pending'
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending payment request for this course' },
        { status: 400 }
      );
    }

    // Create payment request
    const paymentRequest = await PaymentRequest.create({
      userId: currentUserDoc._id,
      courseId: course._id,
      amount: course.price,
      currency: 'USD',
      status: 'pending',
      paymentMethod,
      transactionId,
      paymentProof: paymentProof ? {
        url: paymentProof.url,
        fileName: paymentProof.fileName,
        uploadedAt: new Date()
      } : undefined
    });

    return NextResponse.json({
      success: true,
      message: 'Payment request submitted successfully. Please wait for admin approval.',
      requestId: paymentRequest._id,
      status: 'pending'
    });

  } catch (error: any) {
    console.error('Error creating payment request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Get user's payment requests for this course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ requests: [] });
    }

    await connectToDatabase();

    const currentUserDoc = await User.findOne({ clerkId: user.id });
    if (!currentUserDoc) {
      return NextResponse.json({ requests: [] });
    }

    const { id } = await params;
    
    const requests = await PaymentRequest.find({
      userId: currentUserDoc._id,
      courseId: id
    }).sort({ createdAt: -1 });

    return NextResponse.json({ requests });

  } catch (error) {
    console.error('Error fetching payment requests:', error);
    return NextResponse.json({ requests: [] });
  }
}