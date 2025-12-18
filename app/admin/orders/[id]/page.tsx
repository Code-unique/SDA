'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Truck, Package, Clock, XCircle, Home, Printer } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'

interface OrderItem {
  _id: string
  name: string
  price: number
  quantity: number
  image: string
  designer: {
    username: string
    avatar: string
  }
}

interface Order {
  _id: string
  orderNumber: string
  items: OrderItem[]
  shippingAddress: {
    fullName: string
    street: string
    city: string
    state: string
    postalCode: string
    country: string
    phone: string
  }
  subtotal: number
  shippingFee: number
  tax: number
  total: number
  status: string
  paymentMethod: string
  paymentVerified: boolean
  trackingNumber?: string
  createdAt: string
  updatedAt: string
}

export default function OrderDetailsPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const { id } = useParams()
  const { getToken } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const token = await getToken()
      const res = await fetch(`/api/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
      } else {
        toast.error('Order not found')
        router.push('/')
      }
    } catch (error) {
      console.error('Error fetching order:', error)
      toast.error('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: <Clock className="w-5 h-5" />, color: 'bg-yellow-100 text-yellow-800', text: 'Pending' }
      case 'payment_verification':
        return { icon: <Clock className="w-5 h-5" />, color: 'bg-blue-100 text-blue-800', text: 'Payment Verification' }
      case 'processing':
        return { icon: <Package className="w-5 h-5" />, color: 'bg-purple-100 text-purple-800', text: 'Processing' }
      case 'shipped':
        return { icon: <Truck className="w-5 h-5" />, color: 'bg-indigo-100 text-indigo-800', text: 'Shipped' }
      case 'delivered':
        return { icon: <CheckCircle className="w-5 h-5" />, color: 'bg-green-100 text-green-800', text: 'Delivered' }
      case 'cancelled':
        return { icon: <XCircle className="w-5 h-5" />, color: 'bg-red-100 text-red-800', text: 'Cancelled' }
      default:
        return { icon: <Clock className="w-5 h-5" />, color: 'bg-gray-100 text-gray-800', text: status }
    }
  }

  const printOrder = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 py-12">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-8"></div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 py-12">
        <div className="container mx-auto px-4 text-center">
          <XCircle className="w-24 h-24 mx-auto text-red-400 mb-6" />
          <h2 className="text-3xl font-bold mb-4">Order Not Found</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            The order you're looking for doesn't exist.
          </p>
          <Button onClick={() => router.push('/')}>
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.status)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Order #{order.orderNumber}</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div className="flex gap-2 mt-4 md:mt-0">
            <Button variant="outline" onClick={printOrder}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => router.push('/shop')}>
              <Home className="w-4 h-4 mr-2" />
              Continue Shopping
            </Button>
          </div>
        </div>

        {/* Order Status */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={`${statusInfo.color} px-4 py-2`}>
                  {statusInfo.icon}
                  <span className="ml-2">{statusInfo.text}</span>
                </Badge>
                
                {order.paymentMethod === 'bank_transfer' && (
                  <Badge variant={order.paymentVerified ? "default" : "secondary"}>
                    {order.paymentVerified ? 'Payment Verified' : 'Payment Pending'}
                  </Badge>
                )}
              </div>
              
              {order.trackingNumber && (
                <div className="text-right">
                  <p className="text-sm text-slate-500">Tracking Number</p>
                  <p className="font-mono font-semibold">{order.trackingNumber}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-6">Order Items ({order.items.length})</h3>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-24 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-semibold">{item.name}</h4>
                            <p className="text-sm text-slate-500">
                              by @{item.designer.username}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">${item.price.toFixed(2)}</p>
                            <p className="text-sm text-slate-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-6">Shipping Address</h3>
                <div className="space-y-2">
                  <p className="font-semibold">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                  <p className="text-slate-500">Phone: {order.shippingAddress.phone}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-6">Order Summary</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-semibold">${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Shipping</span>
                    <span className="font-semibold">${order.shippingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tax</span>
                    <span className="font-semibold">${order.tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Payment Method</p>
                    <p className="font-semibold capitalize">
                      {order.paymentMethod.replace('_', ' ')}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Order Status</p>
                    <Badge className={statusInfo.color}>
                      {statusInfo.text}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}