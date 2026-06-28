import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import PaymentRequest from '@/lib/models/PaymentRequest';
import Course from '@/lib/models/Course';
import "@/lib/loadmodels";

// GET - Get single payment request
export async function GET(
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

    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const paymentRequest = await PaymentRequest.findById(id)
      .populate('userId', 'firstName lastName email username avatar clerkId')
      .populate('courseId', 'title slug price thumbnail instructor')
      .populate('approvedBy', 'firstName lastName username');

    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Payment request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(paymentRequest);

  } catch (error: any) {
    console.error('Error fetching payment request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update payment request status
export async function PATCH(
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

    const adminUser = await User.findOne({ clerkId: user.id });
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    const { status, adminNotes } = body;

    if (!status || !['approved', 'rejected', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      );
    }

    const paymentRequest = await PaymentRequest.findById(id);
    if (!paymentRequest) {
      return NextResponse.json(
        { error: 'Payment request not found' },
        { status: 404 }
      );
    }

    // If approving, enroll user in course
    if (status === 'approved' && paymentRequest.status === 'pending') {
      const course = await Course.findById(paymentRequest.courseId);
      if (!course) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }

      // Check if already enrolled
      const isAlreadyEnrolled = course.students.some(
        (student: any) => student.user.toString() === paymentRequest.userId.toString()
      );

      if (!isAlreadyEnrolled) {
        // Enroll user
        await Course.findByIdAndUpdate(
          course._id,
          {
            $push: {
              students: {
                user: paymentRequest.userId,
                enrolledAt: new Date(),
                progress: 0,
                completed: false,
                enrolledThrough: 'manual_payment',
                paymentAmount: paymentRequest.amount
              }
            },
            $inc: { totalStudents: 1 }
          }
        );

        // Create activity log
        await import('@/lib/models/Activity').then(async ({ default: Activity }) => {
          await Activity.create({
            type: 'enrollment',
            userId: paymentRequest.userId,
            courseId: course._id,
            courseTitle: course.title,
            metadata: {
              paymentRequestId: paymentRequest._id,
              amount: paymentRequest.amount,
              approvedBy: adminUser._id
            }
          });
        });
      }
    }

    // Update payment request
    const updateData: any = {
      status,
      adminNotes
    };

    if (status === 'approved') {
      updateData.approvedBy = adminUser._id;
      updateData.approvedAt = new Date();
    }

    const updatedRequest = await PaymentRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('userId', 'firstName lastName email')
     .populate('courseId', 'title');

    return NextResponse.json({
      success: true,
      message: `Payment request ${status} successfully`,
      request: updatedRequest
    });

  } catch (error: any) {
    console.error('Error updating payment request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}