// app/checkout/page.tsx - FULL UPDATED VERSION
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Upload, ShoppingCart , Shield, CreditCard, Building, Truck, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-context'

interface CheckoutItem {
  _id: string
  name: string
  price: number
  quantity: number
  images: string[]
  designer?: {
    username: string
    avatar: string
  }
}

interface CartItem {
  _id: string
  name: string
  price: number
  quantity: number
  images: string[]
  designer?: {
    username: string
    avatar: string
  }
}

export default function CheckoutPage() {
  const [items, setItems] = useState<CheckoutItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const { getToken, isSignedIn } = useAuth()
  const router = useRouter()
  const { clearCart } = useCart()

  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    phone: '',
    notes: '',
  })

  const [formErrors, setFormErrors] = useState({
    fullName: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    phone: '',
  })

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/sign-in?redirect=/checkout')
      return
    }

    loadCartItems()
  }, [isSignedIn, router])

  const loadCartItems = () => {
    try {
      let cartData = null
      
      // Try localStorage first
      const savedCart = localStorage.getItem('cart')
      if (savedCart) {
        cartData = JSON.parse(savedCart)
      }
      
      // Then try sessionStorage
      if (!cartData || !Array.isArray(cartData) || cartData.length === 0) {
        const savedItems = sessionStorage.getItem('checkoutItems')
        if (savedItems) {
          cartData = JSON.parse(savedItems)
        }
      }
      
      if (!cartData || !Array.isArray(cartData) || cartData.length === 0) {
        toast.error('Your cart is empty')
        router.push('/cart')
        return
      }
      
      // Transform cart items to checkout format
      const transformedItems = cartData.map((item: CartItem) => ({
        _id: item._id,
        name: item.name || 'Unnamed Product',
        price: item.price || 0,
        quantity: item.quantity || 1,
        images: item.images || ['/api/placeholder/400/500'],
        designer: item.designer || {
          username: 'Unknown Designer',
          avatar: '/api/placeholder/100/100'
        }
      }))
      
      setItems(transformedItems)
      
      // Store in sessionStorage for consistency
      sessionStorage.setItem('checkoutItems', JSON.stringify(transformedItems))
      
    } catch (error) {
      console.error('Error loading cart items:', error)
      toast.error('Failed to load cart items')
      router.push('/cart')
    }
  }

  const validateForm = () => {
    const errors = {
      fullName: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      phone: '',
    }
    
    let isValid = true
    
    if (!shippingAddress.fullName.trim()) {
      errors.fullName = 'Full name is required'
      isValid = false
    }
    
    if (!shippingAddress.street.trim()) {
      errors.street = 'Street address is required'
      isValid = false
    }
    
    if (!shippingAddress.city.trim()) {
      errors.city = 'City is required'
      isValid = false
    }
    
    if (!shippingAddress.state.trim()) {
      errors.state = 'State/Province is required'
      isValid = false
    }
    
    if (!shippingAddress.postalCode.trim()) {
      errors.postalCode = 'Postal code is required'
      isValid = false
    }
    
    if (!shippingAddress.phone.trim()) {
      errors.phone = 'Phone number is required'
      isValid = false
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(shippingAddress.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone = 'Please enter a valid phone number'
      isValid = false
    }
    
    setFormErrors(errors)
    return isValid
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload an image file (JPEG, PNG, or WebP)')
        return
      }
      
      setPaymentProof(file)
      toast.success('Payment proof uploaded successfully')
    }
  }

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const calculateShipping = () => {
    if (items.length === 0) return 0
    const subtotal = calculateSubtotal()
    // Free shipping for orders over $100
    return subtotal > 100 ? 0 : 5.99
  }

  const calculateTax = () => {
    return calculateSubtotal() * 0.08 // 8% tax rate
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateShipping() + calculateTax()
  }

  const uploadPaymentProof = async (orderId: string, token: string): Promise<boolean> => {
    if (!paymentProof) return false
    
    setUploading(true)
    setUploadProgress(0)
    
    try {
      const formData = new FormData()
      formData.append('file', paymentProof)
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)
      
      const proofRes = await fetch(`/api/orders/${orderId}/payment-proof`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      if (!proofRes.ok) {
        const errorData = await proofRes.json()
        throw new Error(errorData.error || 'Failed to upload payment proof')
      }
      
      const proofData = await proofRes.json()
      console.log('Payment proof uploaded:', proofData)
      
      return true
    } catch (error: any) {
      console.error('Payment proof upload error:', error)
      throw error
    } finally {
      setTimeout(() => {
        setUploading(false)
        setUploadProgress(0)
      }, 500)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly')
      return
    }
    
    // Validate payment method
    if (paymentMethod === 'bank_transfer' && !paymentProof) {
      toast.error('Please upload payment proof for bank transfer')
      return
    }
    
    setLoading(true)
    
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required. Please sign in again.')
      }

      // Prepare order data
      const orderData = {
        items: items.map(item => ({
          productId: item._id,
          quantity: item.quantity,
        })),
        shippingAddress: {
          fullName: shippingAddress.fullName.trim(),
          street: shippingAddress.street.trim(),
          city: shippingAddress.city.trim(),
          state: shippingAddress.state.trim(),
          postalCode: shippingAddress.postalCode.trim(),
          country: shippingAddress.country,
          phone: shippingAddress.phone.trim(),
          notes: shippingAddress.notes.trim(),
        },
        paymentMethod,
        shippingFee: calculateShipping(),
        tax: calculateTax(),
      }

      console.log('Creating order with data:', orderData)

      // Create order
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      const responseData = await orderRes.json()
      
      console.log('Order response:', responseData)
      
      if (!orderRes.ok) {
        // Show detailed validation errors
        if (responseData.details) {
          const errorMessages = responseData.details.map((err: any) => `${err.field}: ${err.message}`).join(', ')
          throw new Error(`Validation failed: ${errorMessages}`)
        }
        throw new Error(responseData.error || `Failed to create order: ${orderRes.status}`)
      }

      const order = responseData
      
      // Upload payment proof if needed
      let paymentProofUploaded = false
      if (paymentMethod === 'bank_transfer' && paymentProof) {
        try {
          paymentProofUploaded = await uploadPaymentProof(order._id, token)
        } catch (uploadError: any) {
          console.warn('Payment proof upload failed:', uploadError)
          // Don't fail the order, just warn the user
          toast.warning('Order created but payment proof upload failed. Please contact support with your order number.')
        }
      }

      // Clear cart and storage
      clearCart()
      sessionStorage.removeItem('checkoutItems')
      localStorage.removeItem('cart')

      // Show success message
      toast.success('Order placed successfully!', {
        description: `Order #${order.orderNumber} has been confirmed.`,
        action: {
          label: 'View Order',
          onClick: () => router.push(`/orders/${order._id}`)
        },
        duration: 5000,
      })
      
      // Redirect to order details page
      setTimeout(() => {
        router.push(`/orders/${order._id}`)
      }, 2000)

    } catch (error: any) {
      console.error('Checkout error:', error)
      
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        toast.error('Request timeout. Please try again.')
      } else if (error.message.includes('stock')) {
        toast.error('Insufficient stock. Please update your cart and try again.')
        router.push('/cart')
      } else {
        toast.error(error.message || 'Checkout failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0 || !isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-md mx-auto">
            <ShoppingCart className="w-24 h-24 mx-auto mb-6 text-slate-300" />
            <h1 className="text-2xl font-bold mb-4">No items to checkout</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Your cart is empty or session has expired.
            </p>
            <Button onClick={() => router.push('/shop')}>
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 py-12">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">Checkout</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Complete your purchase securely
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Form */}
              <div className="space-y-8">
                {/* Shipping Address */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-100 to-pink-100 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-rose-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Shipping Address</h3>
                        <p className="text-sm text-slate-500">Where should we deliver your order?</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="fullName">
                          Full Name *
                          {formErrors.fullName && (
                            <span className="text-red-500 text-sm ml-2">
                              <AlertCircle className="inline w-3 h-3 mr-1" />
                              {formErrors.fullName}
                            </span>
                          )}
                        </Label>
                        <Input
                          id="fullName"
                          value={shippingAddress.fullName}
                          onChange={(e) => {
                            setShippingAddress(prev => ({
                              ...prev,
                              fullName: e.target.value
                            }))
                            if (formErrors.fullName) {
                              setFormErrors(prev => ({ ...prev, fullName: '' }))
                            }
                          }}
                          placeholder="John Doe"
                          className={`mt-1 ${formErrors.fullName ? 'border-red-500' : ''}`}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="street">
                          Street Address *
                          {formErrors.street && (
                            <span className="text-red-500 text-sm ml-2">
                              <AlertCircle className="inline w-3 h-3 mr-1" />
                              {formErrors.street}
                            </span>
                          )}
                        </Label>
                        <Input
                          id="street"
                          value={shippingAddress.street}
                          onChange={(e) => {
                            setShippingAddress(prev => ({
                              ...prev,
                              street: e.target.value
                            }))
                            if (formErrors.street) {
                              setFormErrors(prev => ({ ...prev, street: '' }))
                            }
                          }}
                          placeholder="123 Main St"
                          className={`mt-1 ${formErrors.street ? 'border-red-500' : ''}`}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">
                            City *
                            {formErrors.city && (
                              <span className="text-red-500 text-sm ml-2">
                                <AlertCircle className="inline w-3 h-3 mr-1" />
                                {formErrors.city}
                              </span>
                            )}
                          </Label>
                          <Input
                            id="city"
                            value={shippingAddress.city}
                            onChange={(e) => {
                              setShippingAddress(prev => ({
                                ...prev,
                                city: e.target.value
                              }))
                              if (formErrors.city) {
                                setFormErrors(prev => ({ ...prev, city: '' }))
                              }
                            }}
                            placeholder="New York"
                            className={`mt-1 ${formErrors.city ? 'border-red-500' : ''}`}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="state">
                            State/Province *
                            {formErrors.state && (
                              <span className="text-red-500 text-sm ml-2">
                                <AlertCircle className="inline w-3 h-3 mr-1" />
                                {formErrors.state}
                              </span>
                            )}
                          </Label>
                          <Input
                            id="state"
                            value={shippingAddress.state}
                            onChange={(e) => {
                              setShippingAddress(prev => ({
                                ...prev,
                                state: e.target.value
                              }))
                              if (formErrors.state) {
                                setFormErrors(prev => ({ ...prev, state: '' }))
                              }
                            }}
                            placeholder="NY"
                            className={`mt-1 ${formErrors.state ? 'border-red-500' : ''}`}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="postalCode">
                            Postal Code *
                            {formErrors.postalCode && (
                              <span className="text-red-500 text-sm ml-2">
                                <AlertCircle className="inline w-3 h-3 mr-1" />
                                {formErrors.postalCode}
                              </span>
                            )}
                          </Label>
                          <Input
                            id="postalCode"
                            value={shippingAddress.postalCode}
                            onChange={(e) => {
                              setShippingAddress(prev => ({
                                ...prev,
                                postalCode: e.target.value
                              }))
                              if (formErrors.postalCode) {
                                setFormErrors(prev => ({ ...prev, postalCode: '' }))
                              }
                            }}
                            placeholder="10001"
                            className={`mt-1 ${formErrors.postalCode ? 'border-red-500' : ''}`}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="country">Country *</Label>
                          <Input
                            id="country"
                            value={shippingAddress.country}
                            onChange={(e) => setShippingAddress(prev => ({
                              ...prev,
                              country: e.target.value
                            }))}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">
                          Phone Number *
                          {formErrors.phone && (
                            <span className="text-red-500 text-sm ml-2">
                              <AlertCircle className="inline w-3 h-3 mr-1" />
                              {formErrors.phone}
                            </span>
                          )}
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={shippingAddress.phone}
                          onChange={(e) => {
                            setShippingAddress(prev => ({
                              ...prev,
                              phone: e.target.value
                            }))
                            if (formErrors.phone) {
                              setFormErrors(prev => ({ ...prev, phone: '' }))
                            }
                          }}
                          placeholder="+1 (555) 123-4567"
                          className={`mt-1 ${formErrors.phone ? 'border-red-500' : ''}`}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={shippingAddress.notes}
                          onChange={(e) => setShippingAddress(prev => ({
                            ...prev,
                            notes: e.target.value
                          }))}
                          placeholder="Special delivery instructions..."
                          rows={3}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-100 to-pink-100 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-rose-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Payment Method</h3>
                        <p className="text-sm text-slate-500">How would you like to pay?</p>
                      </div>
                    </div>
                    
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                      className="space-y-4"
                    >
                      <div className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${
                        paymentMethod === 'bank_transfer' ? 'border-rose-500 bg-rose-50' : ''
                      }`}>
                        <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="bank_transfer" className="font-medium cursor-pointer">
                              Bank Transfer
                            </Label>
                            <Building className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            Transfer to our bank account and upload payment screenshot
                          </p>
                        </div>
                      </div>
                      
                      <div className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${
                        paymentMethod === 'cash_on_delivery' ? 'border-rose-500 bg-rose-50' : ''
                      }`}>
                        <RadioGroupItem value="cash_on_delivery" id="cash_on_delivery" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="cash_on_delivery" className="font-medium cursor-pointer">
                              Cash on Delivery
                            </Label>
                            <Shield className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            Pay when you receive your order
                          </p>
                        </div>
                      </div>
                      
                      <div className={`flex items-center space-x-3 p-4 border rounded-xl cursor-pointer transition-all ${
                        paymentMethod === 'card' ? 'border-rose-500 bg-rose-50' : ''
                      }`}>
                        <RadioGroupItem value="card" id="card" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="card" className="font-medium cursor-pointer">
                              Credit/Debit Card
                            </Label>
                            <CreditCard className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            Pay securely with your card
                          </p>
                        </div>
                      </div>
                    </RadioGroup>

                    {/* Payment Proof Upload */}
                    {paymentMethod === 'bank_transfer' && (
                      <div className="mt-6 p-4 border rounded-xl bg-slate-50 dark:bg-slate-800">
                        <Label className="block mb-2 font-medium">
                          Payment Proof (Screenshot/Receipt) *
                        </Label>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <label className="flex-1 cursor-pointer">
                              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-rose-400 transition-colors">
                                {paymentProof ? (
                                  <div className="space-y-2">
                                    <CheckCircle className="w-8 h-8 mx-auto text-green-500" />
                                    <p className="text-sm font-medium truncate">{paymentProof.name}</p>
                                    <p className="text-xs text-slate-500">
                                      {(paymentProof.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                                    <p className="text-sm text-slate-500">Click to upload payment screenshot</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                      PNG, JPG, WebP up to 5MB
                                    </p>
                                  </div>
                                )}
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={uploading}
                              />
                            </label>
                            
                            {paymentProof && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPaymentProof(null)
                                  toast.info('Payment proof removed')
                                }}
                                className="text-rose-500 hover:text-rose-600"
                                disabled={uploading}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          
                          {/* Upload Progress */}
                          {uploading && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Uploading...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
                            <p className="font-medium">Bank Details:</p>
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg space-y-1">
                              <p><span className="font-medium">Bank:</span> FashionHub Bank</p>
                              <p><span className="font-medium">Account:</span> 1234 5678 9012 3456</p>
                              <p><span className="font-medium">Account Name:</span> FashionHub Inc.</p>
                              <p><span className="font-medium">Reference:</span> Order #{Date.now().toString().slice(-6)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Order Summary */}
              <div>
                <Card className="border-0 shadow-lg sticky top-24">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-100 to-pink-100 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-rose-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">Order Summary</h3>
                        <p className="text-sm text-slate-500">{items.reduce((total, item) => total + item.quantity, 0)} items</p>
                      </div>
                    </div>
                    
                    {/* Order Items */}
                    <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pr-2">
                      {items.map((item) => (
                        <div key={item._id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="w-16 h-20 flex-shrink-0">
                            <img
                              src={item.images?.[0] || '/api/placeholder/100/150'}
                              alt={item.name}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = `/api/placeholder/100/150?text=${encodeURIComponent(item.name)}`
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-sm text-slate-500">
                              {item.designer?.username ? `by @${item.designer.username}` : ''}
                            </p>
                            <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${item.price.toFixed(2)}</p>
                            <p className="text-sm text-slate-500">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="my-6" />
                    
                    {/* Price Breakdown */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Shipping</span>
                        <span className="font-semibold">
                          {calculateShipping() === 0 ? (
                            <span className="text-green-500">Free</span>
                          ) : (
                            `$${calculateShipping().toFixed(2)}`
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tax (8%)</span>
                        <span className="font-semibold">${calculateTax().toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                    
                    {/* Free Shipping Notice */}
                    {calculateSubtotal() < 100 && calculateSubtotal() > 0 && (
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Add ${(100 - calculateSubtotal()).toFixed(2)} more for free shipping!
                        </p>
                      </div>
                    )}
                    
                    {/* Security Badge */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-semibold">Secure Checkout</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Your payment is encrypted and secure
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Place Order Button */}
                    <Button
                      type="submit"
                      className="w-full mt-6 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg"
                      size="lg"
                      disabled={
                        loading || 
                        uploading || 
                        (paymentMethod === 'bank_transfer' && !paymentProof)
                      }
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        'Place Order'
                      )}
                    </Button>
                    
                    <p className="text-xs text-center text-slate-500 mt-4">
                      By placing your order, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}