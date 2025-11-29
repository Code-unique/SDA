import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import Course from '@/lib/models/Course'
import PendingEnrollment from '@/lib/models/PendingEnrollment'
import { createStripePaymentIntent } from '@/lib/payment/stripe'
import { initiateKhaltiPayment } from '@/lib/payment/khalti'
import { paymentConfig, validatePaymentConfig } from '@/lib/payment/config'
import { rateLimit } from '@/lib/rate-limit'
import mongoose from 'mongoose'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimitKey = `payment_initiate:${user.id}`
    const rateLimitResult = rateLimit(rateLimitKey, 5)

    if (rateLimitResult.isRateLimited) {
      return NextResponse.json(
        { error: 'Too many payment attempts. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      )
    }

    // Validate payment configuration
    validatePaymentConfig()

    await connectToDatabase()

    // Get user document
    const currentUserDoc = await User.findOne({ clerkId: user.id })
    if (!currentUserDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { id } = await params
    const { paymentMethod } = await request.json()

    if (!paymentMethod || !['stripe', 'khalti'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    // Validate course ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 })
    }

    // Find course
    const course = await Course.findById(id)
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (!course.isPublished) {
      return NextResponse.json({ error: 'Course is not available' }, { status: 403 })
    }

    // Check if user is already enrolled
    const isAlreadyEnrolled = course.students.some(
      (student: any) => student.user.toString() === currentUserDoc._id.toString()
    )

    if (isAlreadyEnrolled) {
      return NextResponse.json(
        {
          error: 'Already enrolled in this course',
          alreadyEnrolled: true
        },
        { status: 400 }
      )
    }

    // Handle free course
    if (course.isFree) {
      return NextResponse.json({
        freeCourse: true,
        message: 'Course is free - proceeding with enrollment'
      })
    }

    // Validate price
    if (course.price <= 0) {
      return NextResponse.json({ error: 'Invalid course price' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // STRIPE PAYMENT FLOW
    if (paymentMethod === 'stripe') {
      try {
        const paymentIntent = await createStripePaymentIntent({
          amount: course.price,
          currency: 'usd',
          metadata: {
            courseId: (course._id as mongoose.Types.ObjectId).toString(), // Fix: Type assertion
            userId: currentUserDoc._id.toString(),
            userEmail: user.emailAddresses[0]?.emailAddress || '',
            courseTitle: course.title
          },
          customerEmail: user.emailAddresses[0]?.emailAddress
        })

        await PendingEnrollment.create({
          paymentIntentId: paymentIntent.paymentIntentId,
          courseId: course._id,
          userId: currentUserDoc._id,
          amount: course.price,
          currency: 'usd',
          paymentMethod: 'stripe',
          status: 'pending',
          expiresAt: new Date(Date.now() + paymentConfig.paymentTimeout)
        })

        return NextResponse.json({
          success: true,
          paymentMethod: 'stripe',
          clientSecret: paymentIntent.clientSecret,
          paymentIntentId: paymentIntent.paymentIntentId,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          headers: rateLimitResult.headers
        })
      } catch (stripeError: any) {
        console.error('Stripe payment initiation failed:', stripeError)
        return NextResponse.json(
          { error: stripeError.message || 'Stripe payment failed' },
          { status: 400 }
        )
      }
    }

    // KHALTI PAYMENT FLOW
    // KHALTI PAYMENT FLOW
if (paymentMethod === 'khalti') {
  try {
    const amountInNPR = Math.round(course.price * paymentConfig.exchangeRate)

    if (amountInNPR < 100) {
      return NextResponse.json(
        { error: 'Payment amount too small for Khalti (minimum 100 NPR)' },
        { status: 400 }
      )
    }

    // Validate Khalti configuration
    if (!paymentConfig.khalti.secretKey) {
      throw new Error('Khalti is not properly configured');
    }

    const khaltiPayload = {
      return_url: `${baseUrl}/courses/${course._id}/payment/success?method=khalti`,
      website_url: baseUrl,
      amount: amountInNPR, // Amount in paisa (100 paisa = 1 NPR)
      purchase_order_id: `COURSE_${course._id}_${Date.now()}`,
      purchase_order_name: course.title.substring(0, 64),
      customer_info: {
        name: `${currentUserDoc.firstName} ${currentUserDoc.lastName}`.substring(0, 64),
        email: user.emailAddresses[0]?.emailAddress || ''
      },
      amount_breakdown: [
        { label: 'Course Fee', amount: amountInNPR }
      ],
      product_details: [
        {
          identity: (course._id as mongoose.Types.ObjectId).toString(),
          name: course.title.substring(0, 64),
          total_price: amountInNPR,
          quantity: 1,
          unit_price: amountInNPR
        }
      ]
    }

    console.log('Initiating Khalti payment with payload:', khaltiPayload);

    const khaltiResponse = await initiateKhaltiPayment(khaltiPayload)

    console.log('Khalti response received:', khaltiResponse);

    // Validate Khalti response
    if (!khaltiResponse.pidx || !khaltiResponse.payment_url) {
      throw new Error('Invalid response from Khalti API');
    }

    await PendingEnrollment.create({
      pidx: khaltiResponse.pidx,
      courseId: course._id,
      userId: currentUserDoc._id,
      amount: course.price,
      amountInNPR: amountInNPR,
      currency: 'npr',
      paymentMethod: 'khalti',
      status: 'pending',
      expiresAt: new Date(khaltiResponse.expires_at)
    })

    return NextResponse.json({
      success: true,
      paymentMethod: 'khalti',
      paymentUrl: khaltiResponse.payment_url,
      pidx: khaltiResponse.pidx,
      amount: amountInNPR,
      currency: 'npr',
      headers: rateLimitResult.headers
    })
  } catch (khaltiError: any) {
    console.error('Khalti payment initiation failed:', khaltiError)
    return NextResponse.json(
      { error: khaltiError.message || 'Khalti payment failed. Please try another method.' },
      { status: 400 }
    )
  }
}
  } catch (error: any) {
    console.error('Unexpected error initiating payment:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}