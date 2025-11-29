import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import PendingEnrollment from '@/lib/models/PendingEnrollment'
import Course from '@/lib/models/Course'
import User from '@/lib/models/User'
import { verifyKhaltiPayment } from '@/lib/payment/khalti'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pidx = searchParams.get('pidx')
    const transactionId = searchParams.get('transaction_id')
    const status = searchParams.get('status')

    if (!pidx) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/payment/failed?error=missing_pidx`)
    }

    await connectToDatabase()

    // Verify payment with Khalti
    const verification = await verifyKhaltiPayment(pidx)

    if (verification.status === 'Completed') {
      const pendingEnrollment = await PendingEnrollment.findOne({ pidx })
      
      if (pendingEnrollment && pendingEnrollment.status === 'pending') {
        // Enroll the user
        const course = await Course.findById(pendingEnrollment.courseId)
        const user = await User.findById(pendingEnrollment.userId)

        if (course && user) {
          course.students.push({
  user: user._id,
  enrolledAt: new Date(),
  progress: 0,
  completed: false
})

          await course.save()

          // Update pending enrollment status
          pendingEnrollment.status = 'completed'
          pendingEnrollment.completedAt = new Date()
          await pendingEnrollment.save()

          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_BASE_URL}/courses/${course._id}/learn?enrolled=true`
          )
        }
      }
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failed?error=verification_failed`
    )
  } catch (error) {
    console.error('Khalti callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failed?error=internal_error`
    )
  }
}