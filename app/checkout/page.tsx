// app/checkout/page.tsx - FIXED CART CLEARING
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
import { Upload, ShoppingCart , Shield, CreditCard, Building, Truck, Lock, CheckCircle } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-context'

interface CheckoutItem {
  _id: string
  name: string
  price: number
  quantity: number
  images: string[]
}

export default function CheckoutPage() {
  const [items, setItems] = useState<CheckoutItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const { getToken, isSignedIn } = useAuth()
  const router = useRouter()
  const { clearCart } = useCart() // Import clearCart from cart context

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

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/sign-in?redirect=/checkout')
      return
    }

    // Try multiple sources for cart data
    let cartData = null
    
    // First try localStorage (most reliable)
    try {
      const savedCart = localStorage.getItem('cart')
      if (savedCart) {
        cartData = JSON.parse(savedCart)
      }
    } catch (e) {
      console.error('Error reading cart from localStorage:', e)
    }
    
    // Then try sessionStorage
    if (!cartData || !Array.isArray(cartData) || cartData.length === 0) {
      try {
        const savedItems = sessionStorage.getItem('checkoutItems')
        if (savedItems) {
          cartData = JSON.parse(savedItems)
        }
      } catch (e) {
        console.error('Error reading cart from sessionStorage:', e)
      }
    }
    
    if (!cartData || !Array.isArray(cartData) || cartData.length === 0) {
      toast.error('Your cart is empty')
      router.push('/cart')
      return
    }
    
    // Transform cart items to checkout format
    const transformedItems = cartData.map((item: any) => ({
      _id: item._id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      images: item.images || ['/api/placeholder/400/500'],
    }))
    
    setItems(transformedItems)
    
    // Store in sessionStorage for consistency
    sessionStorage.setItem('checkoutItems', JSON.stringify(transformedItems))
  }, [isSignedIn, router])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (PNG, JPG, JPEG)')
        return
      }
      setPaymentProof(file)
      toast.success('Payment proof uploaded successfully')
    }
  }

  const calculateSubtotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const calculateShipping = () => items.length > 0 ? 5.99 : 0
  const calculateTax = () => calculateSubtotal() * 0.08
  const calculateTotal = () => calculateSubtotal() + calculateShipping() + calculateTax()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!shippingAddress.fullName || !shippingAddress.street || !shippingAddress.city || 
          !shippingAddress.state || !shippingAddress.postalCode || !shippingAddress.phone) {
        throw new Error('Please fill in all required shipping information')
      }

      if (paymentMethod === 'bank_transfer' && !paymentProof) {
        throw new Error('Please upload payment proof for bank transfer')
      }

      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required. Please sign in again.')
      }

      // Prepare order data with product details
      const orderData = {
        items: items.map(item => ({
          productId: item._id,
          quantity: item.quantity,
        })),
        shippingAddress: {
          fullName: shippingAddress.fullName,
          street: shippingAddress.street,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
          phone: shippingAddress.phone,
          notes: shippingAddress.notes || '',
        },
        paymentMethod,
        shippingFee: calculateShipping(),
        tax: calculateTax(),
      }

      console.log('Sending order data:', orderData)

      // Create order
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
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

      // If bank transfer, upload payment proof
      if (paymentMethod === 'bank_transfer' && paymentProof) {
        setUploading(true)
        try {
          const formData = new FormData()
          formData.append('file', paymentProof)

          const proofRes = await fetch(`/api/orders/${order._id}/payment-proof`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          })

          if (!proofRes.ok) {
            console.warn('Payment proof upload failed, but order was created')
            toast.warning('Order created but payment proof upload failed. Please contact support.')
          }
        } catch (uploadError) {
          console.error('Payment proof upload error:', uploadError)
          // Don't fail the order if upload fails
          toast.warning('Order created but payment proof upload failed. Please contact support.')
        }
      }

      // ✅ FIXED: Clear cart using cart context
      clearCart()
      
      // Clear session storage
      sessionStorage.removeItem('checkoutItems')
      
      // Clear localStorage for cart
      localStorage.removeItem('cart')

      toast.success('Order placed successfully!', {
        description: `Order #${order.orderNumber} has been confirmed.`,
        action: {
          label: 'View Order',
          onClick: () => router.push(`/orders/${order._id}`)
        },
        duration: 5000,
      })
      
      // Redirect to orders page
      setTimeout(() => {
        router.push(`/orders/${order._id}`)
      }, 2000)

    } catch (error: any) {
      console.error('Checkout error:', error)
      toast.error(error.message || 'Checkout failed. Please try again.')
    } finally {
      setLoading(false)
      setUploading(false)
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Form */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-8">
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
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          value={shippingAddress.fullName}
                          onChange={(e) => setShippingAddress(prev => ({
                            ...prev,
                            fullName: e.target.value
                          }))}
                          required
                          placeholder="John Doe"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="street">Street Address *</Label>
                        <Input
                          id="street"
                          value={shippingAddress.street}
                          onChange={(e) => setShippingAddress(prev => ({
                            ...prev,
                            street: e.target.value
                          }))}
                          required
                          placeholder="123 Main St"
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={shippingAddress.city}
                            onChange={(e) => setShippingAddress(prev => ({
                              ...prev,
                              city: e.target.value
                            }))}
                            required
                            placeholder="New York"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="state">State/Province *</Label>
                          <Input
                            id="state"
                            value={shippingAddress.state}
                            onChange={(e) => setShippingAddress(prev => ({
                              ...prev,
                              state: e.target.value
                            }))}
                            required
                            placeholder="NY"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="postalCode">Postal Code *</Label>
                          <Input
                            id="postalCode"
                            value={shippingAddress.postalCode}
                            onChange={(e) => setShippingAddress(prev => ({
                              ...prev,
                              postalCode: e.target.value
                            }))}
                            required
                            placeholder="10001"
                            className="mt-1"
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
                            required
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress(prev => ({
                            ...prev,
                            phone: e.target.value
                          }))}
                          required
                          placeholder="+1 (555) 123-4567"
                          className="mt-1"
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
                                      PNG, JPG up to 5MB
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
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          
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
              </form>
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
                      <span className="font-semibold">${calculateShipping().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tax</span>
                      <span className="font-semibold">${calculateTax().toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                  
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
                    className="w-full mt-6 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={loading || uploading || (paymentMethod === 'bank_transfer' && !paymentProof)}
                  >
                    {loading || uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
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
        </div>
      </div>
    </div>
  )
}