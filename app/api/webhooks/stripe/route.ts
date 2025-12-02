// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payment/stripe';
import { paymentConfig } from '@/lib/payment/config';
import { connectToDatabase } from '@/lib/mongodb';
import Course from '@/lib/models/Course';
import UserProgress from '@/lib/models/UserProgress';
import PendingEnrollment from '@/lib/models/PendingEnrollment';
import Payment from '@/lib/models/Payment';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      paymentConfig.stripe.webhookSecret
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectToDatabase();

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object, session);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object, session);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object, session);
        break;
    }

    await session.commitTransaction();
    return NextResponse.json({ received: true });
  } catch (error) {
    await session.abortTransaction();
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  } finally {
    session.endSession();
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any, session: mongoose.ClientSession) {
  const { metadata } = paymentIntent;

  if (!metadata?.courseId || !metadata?.userId) {
    console.warn('Payment intent missing required metadata');
    return;
  }

  // Find pending enrollment
  const pendingEnrollment = await PendingEnrollment.findOne({
    paymentIntentId: paymentIntent.id,
    status: 'pending'
  }).session(session);

  if (!pendingEnrollment) {
    console.warn('No pending enrollment found for payment intent:', paymentIntent.id);
    return;
  }

  // Check if already enrolled
  const course = await Course.findById(metadata.courseId).session(session);
  if (!course) {
    throw new Error('Course not found');
  }

  const isAlreadyEnrolled = course.students.some(
    (student: any) => student.user.toString() === metadata.userId
  );

  if (isAlreadyEnrolled) {
    console.warn('User already enrolled, skipping enrollment');
    await PendingEnrollment.findByIdAndUpdate(
      pendingEnrollment._id,
      { status: 'completed' },
      { session }
    );
    return;
  }

  // Enroll user
  await Course.findByIdAndUpdate(
    metadata.courseId,
    {
      $push: {
        students: {
          user: metadata.userId,
          enrolledAt: new Date(),
          progress: 0,
          completed: false,
          paymentMethod: 'stripe',
          paymentAmount: pendingEnrollment.amount,
          enrolledThrough: 'payment'
        }
      },
      $inc: { totalStudents: 1 }
    },
    { session }
  );

  // Create user progress
  const firstLesson = course.modules[0]?.lessons[0];
  await UserProgress.create([{
    courseId: metadata.courseId,
    userId: metadata.userId,
    completedLessons: [],
    currentLesson: firstLesson?._id || null,
    progress: 0,
    timeSpent: 0,
    lastAccessed: new Date(),
    completed: false
  }], { session });

  // Update pending enrollment
  await PendingEnrollment.findByIdAndUpdate(
    pendingEnrollment._id,
    {
      status: 'completed',
      completedAt: new Date()
    },
    { session }
  );

  // Create payment record
  await Payment.create([{
    userId: metadata.userId,
    courseId: metadata.courseId,
    amount: pendingEnrollment.amount,
    currency: 'usd',
    paymentMethod: 'stripe',
    status: 'completed',
    transactionId: paymentIntent.id,
    paymentIntentId: paymentIntent.id,
    metadata: {
      courseTitle: metadata.courseTitle || 'Unknown Course',
      userEmail: metadata.userEmail || '',
      userName: metadata.userName || 'Unknown User'
    }
  }], { session });
}

async function handlePaymentIntentFailed(paymentIntent: any, session: mongoose.ClientSession) {
  await PendingEnrollment.findOneAndUpdate(
    { paymentIntentId: paymentIntent.id },
    { status: 'failed' },
    { session }
  );
}

async function handlePaymentIntentCanceled(paymentIntent: any, session: mongoose.ClientSession) {
  await PendingEnrollment.findOneAndUpdate(
    { paymentIntentId: paymentIntent.id },
    { status: 'failed' },
    { session }
  );
}