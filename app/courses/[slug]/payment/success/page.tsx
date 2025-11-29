'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const courseSlug = params.slug as string
  const pidx = searchParams.get('pidx')
  const status = searchParams.get('status')
  const transactionId = searchParams.get('transaction_id')
  const amount = searchParams.get('amount')
  const purchaseOrderName = searchParams.get('purchase_order_name')

  // Use ref to prevent multiple API calls
  const hasVerifiedRef = useRef(false)

  console.log('Payment Success Page - URL Params:', {
    courseSlug,
    pidx,
    status,
    transactionId,
    amount,
    purchaseOrderName
  })

  useEffect(() => {
    // Prevent multiple verifications
    if (hasVerifiedRef.current || !pidx) {
      if (!pidx) {
        setIsVerifying(false)
        setError('Missing payment information')
      }
      return
    }

    hasVerifiedRef.current = true
    
    const verifyPayment = async () => {
      console.log('Starting payment verification...')
      console.log('Course Slug/ID:', courseSlug)

      try {
        console.log('Calling verify API directly...')
        
        const courseId = courseSlug

        const response = await fetch(`/api/courses/${courseId}/payment/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentMethod: 'khalti',
            pidx: pidx
          }),
        })

        console.log('Verify API response status:', response.status)
        const data = await response.json()
        console.log('Verify API response data:', data)

        if (response.ok) {
          if (data.enrolled) {
            console.log('Enrollment successful!')
            setIsSuccess(true)
            toast({
              title: '🎉 Enrollment Successful!',
              description: 'You have been successfully enrolled in the course.',
              variant: 'default',
            })
          } else if (data.alreadyEnrolled) {
            console.log('User already enrolled - showing success')
            setIsSuccess(true)
            toast({
              title: '✅ Already Enrolled',
              description: 'You are already enrolled in this course.',
              variant: 'default',
            })
          } else if (data.success) {
            console.log('Payment verified successfully:', data)
            setIsSuccess(true)
            toast({
              title: '✅ Payment Successful',
              description: data.message || 'Your payment has been processed successfully.',
              variant: 'default',
            })
          } else {
            console.log('Unexpected success response:', data)
            setIsSuccess(true)
            setError('Payment processed but enrollment status unclear')
          }
        } else {
          const errorMessage = data.error || data.message || `Payment verification failed (${response.status})`;
          console.error('Enrollment failed:', errorMessage)
          setError(errorMessage)
        }
      } catch (err: any) {
        console.error('Verification error:', err)
        setError(err.message || 'Failed to verify payment')
      } finally {
        setIsVerifying(false)
      }
    }

    verifyPayment()
  }, [pidx, courseSlug, toast]) // Dependencies

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Verifying Payment</h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Please wait while we confirm your payment...
                </p>
              </div>
              {pidx && (
                <Badge variant="secondary" className="font-mono text-xs">
                  PIDX: {pidx}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {isSuccess ? (
              <>
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-green-800 dark:text-green-400">Payment Successful!</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">
                    You are now enrolled in the course.
                  </p>
                  {purchaseOrderName && (
                    <p className="text-slate-800 dark:text-white font-medium">
                      {purchaseOrderName}
                    </p>
                  )}
                </div>
                
                <div className="w-full space-y-3 mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Amount:</span>
                    <span className="font-semibold">NPR {amount}</span>
                  </div>
                  {transactionId && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Transaction ID:</span>
                      <span className="font-mono text-xs">{transactionId}</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => router.push(`/courses/${courseSlug}`)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg rounded-xl"
                  size="lg"
                >
                  Back to Course
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="outline"
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-red-800 dark:text-red-400">Payment Failed</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">
                    {error || 'There was an issue with your payment.'}
                  </p>
                </div>
                
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={() => router.push(`/courses/${courseSlug}`)}
                    variant="outline"
                    className="flex-1"
                  >
                    Back to Course
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}