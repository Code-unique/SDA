// app/admin/orders/[id]/page.tsx - NEW FILE
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CheckCircle, 
  Truck, 
  Package, 
  Clock, 
  XCircle, 
  Home, 
  Printer, 
  Download, 
  Eye,
  Check,
  X
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import Image from 'next/image'

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
  user: {
    name: string
    email: string
    phone?: string
  }
  subtotal: number
  shippingFee: number
  tax: number
  total: number
  status: string
  paymentMethod: string
  paymentVerified: boolean
  paymentScreenshot?: {
    publicId: string
    url: string
    uploadedAt: string
  }
  trackingNumber?: string
  adminNotes?: string
  createdAt: string
  updatedAt: string
}

export default function AdminOrderDetailsPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [status, setStatus] = useState('')
  const { id } = useParams()
  const { getToken } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchOrder()
  }, [id])

  const fetchOrder = async () => {
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in to view orders')
        router.push('/sign-in')
        return
      }
      
      const res = await fetch(`/api/admin/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
        setAdminNotes(data.adminNotes || '')
        setTrackingNumber(data.trackingNumber || '')
        setStatus(data.status || '')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Order not found')
        router.push('/admin/orders')
      }
    } catch (error) {
      console.error('Error fetching order:', error)
      toast.error('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const updateOrder = async (updates: any) => {
    try {
      setUpdating(true)
      const token = await getToken()
      
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        const data = await res.json()
        setOrder(data)
        toast.success('Order updated successfully')
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update order')
      }
    } catch (error: any) {
      console.error('Error updating order:', error)
      toast.error(error.message || 'Failed to update order')
    } finally {
      setUpdating(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    await updateOrder({ status: newStatus })
  }

  const handleVerifyPayment = async () => {
    await updateOrder({ 
      paymentVerified: true,
      status: 'processing'
    })
  }

  const handleSaveNotes = async () => {
    await updateOrder({ adminNotes })
  }

  const handleSaveTracking = async () => {
    await updateOrder({ trackingNumber })
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <XCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
        <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          The order you're looking for doesn't exist.
        </p>
        <Button onClick={() => router.push('/admin/orders')}>
          Back to Orders
        </Button>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.status)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Order #{order.orderNumber}</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={() => router.push('/admin/orders')}>
            <Home className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Status & Actions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
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
                
                <div className="flex gap-2">
                  <Select value={status} onValueChange={handleStatusChange} disabled={updating}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Change Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="payment_verification">Payment Verification</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {order.paymentMethod === 'bank_transfer' && !order.paymentVerified && (
                    <Button 
                      onClick={handleVerifyPayment} 
                      disabled={updating}
                      variant="default"
                    >
                      {updating ? 'Verifying...' : 'Verify Payment'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Payment Screenshot Section */}
              {order.paymentMethod === 'bank_transfer' && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Payment Proof</h3>
                  
                  {order.paymentScreenshot ? (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium">Payment Screenshot</p>
                            <p className="text-sm text-slate-500">
                              Uploaded on {formatDate(order.paymentScreenshot.uploadedAt)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(order.paymentScreenshot!.url, '_blank')}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Full Size
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = order.paymentScreenshot!.url
                                link.download = `payment-proof-${order.orderNumber}.jpg`
                                link.click()
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                        
                        <div className="relative aspect-video rounded-lg overflow-hidden border">
                          <img
                            src={order.paymentScreenshot.url}
                            alt="Payment Proof"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        {order.paymentVerified ? (
                          <>
                            <Check className="w-5 h-5 text-green-500" />
                            <div>
                              <p className="font-medium">Payment Verified</p>
                              <p className="text-sm text-slate-500">
                                Payment has been verified and approved
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Clock className="w-5 h-5 text-yellow-500" />
                            <div>
                              <p className="font-medium">Awaiting Verification</p>
                              <p className="text-sm text-slate-500">
                                Payment proof uploaded, awaiting admin verification
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed rounded-lg text-center">
                      <XCircle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-600 dark:text-slate-400">
                        No payment proof uploaded yet
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Customer needs to upload payment screenshot
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
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
                          <p className="text-sm font-semibold">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
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
                  <p className="text-sm text-slate-500 mb-1">Customer</p>
                  <p className="font-semibold">{order.user.name}</p>
                  <p className="text-sm text-slate-500">{order.user.email}</p>
                  {order.user.phone && (
                    <p className="text-sm text-slate-500">{order.user.phone}</p>
                  )}
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

          {/* Tracking Number */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Tracking Information</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="trackingNumber">Tracking Number</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="trackingNumber"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                    />
                    <Button 
                      onClick={handleSaveTracking} 
                      disabled={updating || !trackingNumber.trim()}
                    >
                      {updating ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
                
                {order.trackingNumber && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm font-medium">Current Tracking:</p>
                    <p className="font-mono">{order.trackingNumber}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Admin Notes</h3>
              <div className="space-y-3">
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this order..."
                  rows={4}
                  className="resize-none"
                />
                <Button 
                  onClick={handleSaveNotes} 
                  disabled={updating}
                  className="w-full"
                >
                  {updating ? 'Saving...' : 'Save Notes'}
                </Button>
                
                {order.adminNotes && (
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm font-medium mb-2">Current Notes:</p>
                    <p className="text-sm whitespace-pre-wrap">{order.adminNotes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}