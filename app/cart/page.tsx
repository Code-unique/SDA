'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ShoppingCart, Shield, Truck, RefreshCw } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { useCart } from '@/lib/cart-context'

export default function CartPage() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const { 
    cart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    getCartCount,
    getCartTotal 
  } = useCart()

  const calculateShipping = () => {
    return cart.length > 0 ? 5.99 : 0
  }

  const calculateTax = () => {
    return getCartTotal() * 0.08
  }

  const calculateTotal = () => {
    return getCartTotal() + calculateShipping() + calculateTax()
  }

  const handleCheckout = () => {
    if (!isSignedIn) {
      router.push('/sign-in?redirect=/checkout')
      return
    }

    if (cart.length === 0) {
      return
    }

    sessionStorage.setItem('checkoutItems', JSON.stringify(cart))
    router.push('/checkout')
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-16 h-16 text-rose-500" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Your cart is empty</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Looks like you haven't added any fashion items to your cart yet.
            </p>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
              onClick={() => router.push('/shop')}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Shopping Cart</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {getCartCount()} items in your cart
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-6">
                  {cart.map((item) => (
                    <div key={item._id} className="flex items-start gap-4 p-4 border rounded-xl">
                      <div className="relative w-24 h-32 flex-shrink-0">
                        <img
                          src={item.images?.[0] || '/api/placeholder/200/300'}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `/api/placeholder/200/300?text=${encodeURIComponent(item.name)}`
                          }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="font-semibold text-lg mb-1 line-clamp-1">{item.name}</h3>
                            <p className="text-sm text-slate-500 mb-2">
                              by @{item.designer?.username || 'designer'}
                            </p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                              ${item.price.toFixed(2)}
                            </p>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item._id)}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(item._id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="rounded-full"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-12 text-center font-semibold">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(item._id, item.quantity + 1)}
                              disabled={item.quantity >= (item.stock || 99)}
                              className="rounded-full"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <p className="text-lg font-bold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={clearCart}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Items
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="border-0 shadow-lg sticky top-24">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-6">Order Summary</h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-semibold">${getCartTotal().toFixed(2)}</span>
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
                
                <Button 
                  className="w-full mb-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
                  size="lg"
                  onClick={handleCheckout}
                >
                  Proceed to Checkout
                </Button>
                
                <div className="space-y-4 text-sm text-slate-600">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Secure Checkout</p>
                      <p>Your payment is protected with 256-bit SSL encryption</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Free Returns</p>
                      <p>30-day return policy for all items</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 text-purple-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Easy Exchanges</p>
                      <p>Quick and hassle-free exchanges</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/shop')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Continue Shopping
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}