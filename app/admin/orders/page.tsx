'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, CheckCircle, Truck, Package, XCircle, Filter, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'all', label: 'All Status' }, // Changed from empty string
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'payment_verification', label: 'Payment Verification', color: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'Processing', color: 'bg-purple-100 text-purple-800' },
  { value: 'shipped', label: 'Shipped', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      // Prepare query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (search) {
        params.append('search', search);
      }

      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store' // Don't cache for admin panel
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const data = await res.json();
      setOrders(data.orders || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      setUpdatingOrder(orderId);
      const token = await getToken();
      
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        toast.success('Order status updated');
        fetchOrders();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update order');
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error(error.message || 'Failed to update order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const verifyPayment = async (orderId: string) => {
    try {
      setUpdatingOrder(orderId);
      const token = await getToken();
      
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          paymentVerified: true,
          status: 'processing'
        }),
      });

      if (res.ok) {
        toast.success('Payment verified successfully');
        fetchOrders();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to verify payment');
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast.error(error.message || 'Failed to verify payment');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'processing': return <Package className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Order Management</h1>
        <p className="text-gray-600">View and manage all customer orders</p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by order number, customer name, or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchOrders();
                  }
                }}
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchOrders} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No orders found</h3>
            <p className="text-gray-600">
              {search || statusFilter !== 'all' 
                ? 'Try changing your search criteria' 
                : 'No orders have been placed yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order: any) => (
              <Card key={order._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-semibold">
                          Order #{order.orderNumber}
                        </h3>
                        <Badge className={statusOptions.find(s => s.value === order.status)?.color}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1">
                            {statusOptions.find(s => s.value === order.status)?.label}
                          </span>
                        </Badge>
                        {order.paymentMethod === 'bank_transfer' && (
                          <Badge variant={order.paymentVerified ? "default" : "secondary"}>
                            {order.paymentVerified ? 'Payment Verified' : 'Payment Pending'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">Customer:</span> {order.user.name} ({order.user.email})</p>
                        <p><span className="font-medium">Date:</span> {formatDate(order.createdAt)}</p>
                        <p><span className="font-medium">Total:</span> ${order.total.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/orders/${order._id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      
                      {order.status === 'payment_verification' && !order.paymentVerified && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => verifyPayment(order._id)}
                          disabled={updatingOrder === order._id}
                        >
                          {updatingOrder === order._id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Verify Payment
                        </Button>
                      )}
                      
                      {order.status === 'pending' && order.paymentMethod !== 'bank_transfer' && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => updateOrderStatus(order._id, 'processing')}
                          disabled={updatingOrder === order._id}
                        >
                          {updatingOrder === order._id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : null}
                          Start Processing
                        </Button>
                      )}
                      
                      {order.status === 'processing' && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => updateOrderStatus(order._id, 'shipped')}
                          disabled={updatingOrder === order._id}
                        >
                          {updatingOrder === order._id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Truck className="w-4 h-4 mr-2" />
                          )}
                          Mark as Shipped
                        </Button>
                      )}
                      
                      {order.status === 'shipped' && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => updateOrderStatus(order._id, 'delivered')}
                          disabled={updatingOrder === order._id}
                        >
                          {updatingOrder === order._id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Mark as Delivered
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Items ({order.items?.length || 0})</h4>
                    <div className="space-y-2">
                      {order.items?.map((item: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          <img
                            src={item.image || '/api/placeholder/100/100'}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-gray-600">by @{item.designer?.username || 'designer'}</p>
                          </div>
                          <div className="text-right">
                            <p>${item.price?.toFixed(2)} × {item.quantity}</p>
                            <p className="font-semibold">
                              ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (page > 3) {
                  pageNum = page - 2 + i;
                }
                if (pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}