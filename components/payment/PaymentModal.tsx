'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from "@/components/ui/use-toast"
import { 
  CreditCard, 
  Smartphone, 
  Lock, 
  CheckCircle, 
  X,
  Loader2,
  Shield,
  Globe,
  User
} from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!)

interface PaymentModalProps {
  course: {
    _id: string
    title: string
    price: number
    isFree: boolean
    slug: string
    thumbnail: {
      url: string
    }
  }
  isOpen: boolean
  onClose: () => void
  onSuccess: (courseId: string) => void
}

interface PaymentMethodOption {
  id: 'stripe' | 'khalti'
  name: string
  description: string
  icon: React.ReactNode
  supportedCurrencies: string[]
}

const paymentMethods: PaymentMethodOption[] = [
  {
    id: 'stripe',
    name: 'Credit/Debit Card',
    description: 'Pay with Visa, Mastercard, or other major cards',
    icon: <CreditCard className="w-6 h-6" />,
    supportedCurrencies: ['USD']
  },
  {
    id: 'khalti',
    name: 'Khalti',
    description: 'Popular Nepali payment wallet',
    icon: <Smartphone className="w-6 h-6" />,
    supportedCurrencies: ['NPR']
  }
]


function StripePaymentForm({ 
  clientSecret, 
  onSuccess, 
  onError,
  user
}: { 
  clientSecret: string
  onSuccess: () => void
  onError: (error: string) => void
  user: any
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canSubmit, setCanSubmit] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stripe || !elements) {
      setError('Payment system not ready. Please try again.')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
          payment_method_data: {
            billing_details: {
              name: user.name,
              email: user.email,
            }
          }
        },
        redirect: 'if_required'
      })

      if (stripeError) {
        setError(stripeError.message || 'Payment failed. Please try again.')
        onError(stripeError.message || 'Payment failed')
      } else {
        onSuccess()
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Payment failed. Please try again.'
      setError(errorMessage)
      onError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* User Information Display */}
        <div className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <User className="w-5 h-5 text-slate-500" />
          <div>
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        {/* Payment Element */}
        <PaymentElement 
          options={{
            layout: 'tabs',
            fields: {
              billingDetails: {
                name: 'auto',
                email: 'auto',
              }
            },
            defaultValues: {
              billingDetails: {
                name: user.name,
                email: user.email,
              }
            }
          }}
          onChange={(event) => {
            setCanSubmit(event.complete)
          }}
        />
      </div>
      
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}
      
      <Button
        type="submit"
        disabled={!stripe || isProcessing || !canSubmit}
        className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-lg shadow-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Pay ${user.coursePrice}
          </>
        )}
      </Button>

      <div className="text-center">
        <p className="text-xs text-slate-500 flex items-center justify-center">
          <Shield className="w-3 h-3 mr-1" />
          Your payment information is secure and encrypted
        </p>
      </div>
    </form>
  )
}

export function PaymentModal({ course, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { user: clerkUser } = useUser()
  const { toast } = useToast()
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'khalti' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentData, setPaymentData] = useState<{
    clientSecret?: string
    paymentIntentId?: string
    paymentUrl?: string
    pidx?: string
  } | null>(null)
  const [user, setUser] = useState<any>(null)

  // Get user data from Clerk
  useEffect(() => {
    if (clerkUser && isOpen) {
      const userData = {
        name: clerkUser.fullName || 'Customer',
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        coursePrice: course.price
      }
      setUser(userData)
    }
  }, [clerkUser, isOpen, course.price])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMethod(null)
      setPaymentData(null)
      setIsProcessing(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const initiatePayment = async (method: 'stripe' | 'khalti') => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/courses/${course._id}/payment/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethod: method }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment')
      }

      if (method === 'stripe') {
        setPaymentData({
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId
        })
      } else if (method === 'khalti') {
        // Redirect to Khalti payment page
        window.location.href = data.paymentUrl
      }

      setSelectedMethod(method)

    } catch (error: any) {
      console.error('Error initiating payment:', error)
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to initiate payment',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const verifyPayment = async () => {
    if (!selectedMethod || !paymentData) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/courses/${course._id}/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: selectedMethod,
          paymentIntentId: paymentData.paymentIntentId,
          pidx: paymentData.pidx
        }),
      })

      const data = await response.json()

      if (response.ok && data.enrolled) {
        toast({
          title: '🎉 Enrollment Successful!',
          description: `You've been enrolled in "${course.title}"`,
          variant: 'default',
        })
        onSuccess(course._id)
        onClose()
      } else {
        throw new Error(data.error || 'Payment verification failed')
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error)
      toast({
        title: 'Enrollment Failed',
        description: error.message || 'Failed to verify payment and enroll',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStripeSuccess = () => {
    verifyPayment()
  }

  const handleStripeError = (error: string) => {
    toast({
      title: 'Payment Failed',
      description: error,
      variant: 'destructive',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-slate-200/50 dark:border-slate-700/50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-bold">Enroll in Course</h2>
            <p className="text-slate-600 dark:text-slate-400">Complete your enrollment</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Course Summary */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-4">
            <img
              src={course.thumbnail.url}
              alt={course.title}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
            />
            <div className="flex-1">
              <h3 className="font-semibold line-clamp-2">{course.title}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="rounded-full">
                  {course.isFree ? 'Free' : `$${course.price}`}
                </Badge>
                <span className="text-sm text-slate-500">One-time payment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="p-6">
          {!selectedMethod ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Select Payment Method</h3>
              
              {paymentMethods.map((method) => (
                <Card
                  key={method.id}
                  className={`cursor-pointer transition-all duration-200 border-2 hover:border-rose-500 hover:shadow-lg ${
                    selectedMethod === method.id 
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20' 
                      : 'border-slate-200 dark:border-slate-700'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isProcessing && initiatePayment(method.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center text-white">
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{method.name}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {method.description}
                        </p>
                      </div>
                      {isProcessing && selectedMethod === method.id && (
                        <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Security Badges */}
              <div className="flex items-center justify-center space-x-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                  <Shield className="w-4 h-4" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                  <Lock className="w-4 h-4" />
                  <span>Encrypted</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-500">
                  <Globe className="w-4 h-4" />
                  <span>Global</span>
                </div>
              </div>
            </div>
          ) : selectedMethod === 'stripe' && paymentData?.clientSecret && user ? (
            <Elements stripe={stripePromise} options={{ 
              clientSecret: paymentData.clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#e11d48',
                  colorBackground: '#ffffff',
                  colorText: '#1e293b',
                  colorDanger: '#dc2626',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  spacingUnit: '4px',
                  borderRadius: '12px'
                }
              }
            }}>
              <StripePaymentForm
                clientSecret={paymentData.clientSecret}
                onSuccess={handleStripeSuccess}
                onError={handleStripeError}
                user={user}
              />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  )
}