'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  CheckCircle, 
  Clock, 
  Truck, 
  XCircle, 
  Filter,
  Search,
  Download,
  ExternalLink,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Order {
  _id: string;
  orderNumber: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    image: string;
  }>;
  total: number;
  status: 'pending' | 'payment_verification' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: 'bank_transfer' | 'cash_on_delivery';
  paymentVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/sign-in?redirect=/orders');
      return;
    }
    fetchOrders();
  }, [isSignedIn]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      
      if (!token) {
        setError('You must be logged in to view orders');
        setLoading(false);
        return;
      }

      console.log('Fetching orders with token...');
      
      const res = await fetch('/api/orders/my-orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      const data = await res.json();
      
      console.log('Orders API response:', { status: res.status, data });

      if (!res.ok) {
        throw new Error(data.error || `Failed to fetch orders: ${res.status}`);
      }

      setOrders(data.orders || []);
      
      if (data.orders && data.orders.length === 0) {
        toast.info('No orders found. Start shopping!');
      }
      
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setError(error.message || 'Failed to load orders. Please try again.');
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' };
      case 'payment_verification':
        return { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Payment Verification' };
      case 'processing':
        return { color: 'bg-purple-100 text-purple-800', icon: Package, label: 'Processing' };
      case 'shipped':
        return { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Shipped' };
      case 'delivered':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Delivered' };
      case 'cancelled':
        return { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock, label: status };
    }
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <CardContent>
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">Sign In Required</h3>
            <p className="text-gray-600 mb-6">
              Please sign in to view your orders
            </p>
            <Button onClick={() => router.push('/sign-in?redirect=/orders')}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Orders</h1>
            <p className="text-gray-600">Track and manage your purchases</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchOrders} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => router.push('/shop')}>
              <ShoppingBag className="w-4 h-4 mr-2" />
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Orders
          </Button>
          {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => {
            const statusInfo = getStatusInfo(status);
            const Icon = statusInfo.icon;
            
            return (
              <Button
                key={status}
                variant={filter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {statusInfo.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-700">Error Loading Orders</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchOrders}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">
              {filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? "You haven't placed any orders yet. Start shopping to see your orders here."
                : `You don't have any ${filter} orders at the moment.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {filter !== 'all' && (
                <Button variant="outline" onClick={() => setFilter('all')}>
                  View All Orders
                </Button>
              )}
              <Button onClick={() => router.push('/shop')}>
                <ShoppingBag className="w-4 h-4 mr-2" />
                Browse Products
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-gray-600">
              Showing {filteredOrders.length} {filter === 'all' ? '' : filter} order{filteredOrders.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {filteredOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const StatusIcon = statusInfo.icon;
            const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
            
            return (
              <Card key={order._id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">Order #{order.orderNumber}</h3>
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        {order.paymentMethod === 'bank_transfer' && (
                          <Badge variant={order.paymentVerified ? "default" : "secondary"}>
                            {order.paymentVerified ? 'Payment Verified' : 'Payment Pending'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</p>
                        <p>{itemCount} item{itemCount !== 1 ? 's' : ''} • Total: ${order.total.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/orders/${order._id}`}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Details
                        </a>
                      </Button>
                      
                      {order.status === 'delivered' && (
                        <Button size="sm">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Received
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Order Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex space-x-2 overflow-x-auto pb-2">
                        {order.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex-shrink-0 w-16 h-16 relative">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/api/placeholder/100/100';
                              }}
                            />
                            {item.quantity > 1 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                                {item.quantity}
                              </span>
                            )}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                            <span className="text-sm font-semibold text-gray-600">
                              +{order.items.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}