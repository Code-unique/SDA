import Stripe from 'stripe'
import { paymentConfig } from './config'

export const stripe = new Stripe(paymentConfig.stripe.secretKey, {
  apiVersion: '2025-10-29.clover', // Updated to latest version
})

export interface CreatePaymentIntentParams {
  amount: number
  currency: string
  metadata: {
    courseId: string
    userId: string
    userEmail: string
    courseTitle: string
  }
  customerEmail?: string
}

export async function createStripePaymentIntent(params: CreatePaymentIntentParams) {
  try {
    if (params.amount < 0.5) {
      throw new Error('Amount must be at least $0.50')
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100),
      currency: params.currency,
      metadata: params.metadata,
      receipt_email: params.customerEmail,
      automatic_payment_methods: {
        enabled: true,
      },
      description: `Course enrollment: ${params.metadata.courseTitle}`,
    })

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount: params.amount,
      currency: params.currency,
    }
  } catch (error: any) {
    console.error('Error creating Stripe payment intent:', error)
    
    if (error.type === 'StripeAuthenticationError') {
      throw new Error('Invalid Stripe API key. Please check your environment variables.')
    } else if (error.type === 'StripeInvalidRequestError') {
      throw new Error(`Invalid request: ${error.message}`)
    } else if (error.code === 'amount_too_small') {
      throw new Error('Payment amount is too small. Minimum amount is $0.50.')
    }
    
    throw new Error(`Payment failed: ${error.message}`)
  }
}

export async function retrieveStripePaymentIntent(paymentIntentId: string) {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId)
  } catch (error: any) {
    console.error('Error retrieving Stripe payment intent:', error)
    
    if (error.type === 'StripeAuthenticationError') {
      throw new Error('Invalid Stripe API key. Please check your environment variables.')
    }
    
    throw new Error('Failed to retrieve payment intent')
  }
}